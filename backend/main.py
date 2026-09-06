from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, HTTPException, Request
import asyncio
import time
import re
import random
import numpy as np
import queue as pyqueue

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from vad_stream import StreamingVad
from stt_test import transcribe_array
from llm_stream_test import stream_llm_sentences, build_system_prompt
from tts_test import synthesize
from audio_utils import pcm_to_wav_bytes
from resume import extract_text_from_pdf
from auth import get_current_user_id, verify_token
from db import (
    create_session,
    get_session,
    get_resume_text,
    get_latest_resume_text,
    save_transcript,
    get_transcript,
    save_timings,
    get_timings,
    save_report,
    get_user_sessions,
)
from report import generate_report

from fastapi.middleware.cors import CORSMiddleware


# Phrases that signal the candidate wants to end the interview -- checked
# against their transcribed text as a fast, free heuristic (no LLM call)
# before the normal reply flow runs.
_END_PHRASES = [
    "bye", "goodbye", "good bye",
    "i am done", "i'm done", "im done",
    "that is all", "that's all", "thats all",
    "i think that's it", "i think that is it",
    "let's end", "lets end", "let's stop", "lets stop",
    "we can stop", "can we stop",
    "i'd like to stop", "i would like to stop",
    "wrap up", "wrap this up",
    "that concludes", "no more questions",
    "i want to end", "i'm ready to stop", "im ready to stop",
]

_CLOSING_MESSAGES = [
    "Sounds good, let's wrap up here. Great work today -- I'm generating your report now.",
    "Understood, that's a wrap. Nice job today -- your report is being put together now.",
    "Got it, let's stop there. Thanks for practicing -- generating your feedback now.",
]


def is_end_of_interview(text: str) -> bool:
    lowered = text.lower()
    return any(
        re.search(rf"\b{re.escape(phrase)}\b", lowered) for phrase in _END_PHRASES
    )


def get_rate_limit_key(request: Request) -> str:
    """Rate-limit by logged-in user ID when we can identify one --
    fairer than IP alone, since IP-based limits are easy to sidestep
    (VPN, mobile network switch) and unfairly shared by anyone behind
    the same network. Falls back to IP for anything unauthenticated."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        try:
            return verify_token(token)
        except HTTPException:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=get_rate_limit_key)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/upload-resume")
@limiter.limit("10/hour")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    pdf_bytes = await file.read()
    resume_text = extract_text_from_pdf(pdf_bytes)
    session_id = create_session(user_id, resume_text)
    return {"session_id": session_id, "preview": resume_text[:200]}


@app.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    """Every past session belonging to the logged-in user -- what the
    Past Interviews page lists."""
    return get_user_sessions(user_id)


@app.post("/continue-with-previous-resume")
@limiter.limit("20/hour")
async def continue_with_previous_resume(
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    """Starts a brand-new session, reusing the resume text from the
    user's most recent session -- no re-upload needed."""
    resume_text = get_latest_resume_text(user_id)
    if not resume_text:
        return {"error": "No previous resume found."}

    session_id = create_session(user_id, resume_text)
    return {"session_id": session_id, "preview": resume_text[:200]}


@app.websocket("/ws/audio")
async def audio_websocket(
    websocket: WebSocket,
    session_id: str = None,
    access_token: str = None,
):
    await websocket.accept()

    # WebSocket connections can't carry a normal Authorization header
    # from browser JS -- the token travels as a query param instead,
    # same as session_id, and gets verified manually here.
    if not access_token:
        await websocket.close(code=4001, reason="Missing access token")
        return
    try:
        user_id = verify_token(access_token)
    except HTTPException:
        await websocket.close(code=4001, reason="Invalid access token")
        return

    print(f"Client connected (session_id={session_id}, user_id={user_id})")

    vad = StreamingVad()
    loop = asyncio.get_event_loop()

    existing_transcript = get_transcript(session_id, user_id) if session_id else None

    if existing_transcript:
        messages = existing_transcript
        print(f"Resuming session {session_id} with {len(messages)} prior messages")
    else:
        resume_text = get_resume_text(session_id, user_id) if session_id else None
        system_prompt = build_system_prompt(resume_text)
        messages = [{"role": "system", "content": system_prompt}]

    timings = (get_timings(session_id, user_id) if session_id else []) or []
    question_start_time = None

    try:
        while True:
            pcm_chunk = await websocket.receive_bytes()

            utterance = vad.process_chunk(pcm_chunk)
            if utterance:
                audio_array = np.frombuffer(utterance, dtype=np.int16)

                user_text = (await loop.run_in_executor(
                    None, transcribe_array, audio_array
                )).strip()

                _HALLUCINATION_ARTIFACTS = {
                    "thank you", "thanks", "thank you.", "you",
                    "thanks for watching", "okay",
                }
                if not user_text or user_text.lower().strip(".!?") in _HALLUCINATION_ARTIFACTS:
                    continue

                if question_start_time is not None:
                    duration_seconds = round(time.time() - question_start_time, 1)
                    timings.append(duration_seconds)
                    question_start_time = None

                print(f"User: {user_text}")
                await websocket.send_text(f"__USER__{user_text}")
                messages.append({"role": "user", "content": user_text})

                if is_end_of_interview(user_text):
                    # Skip the normal LLM path entirely -- a canned,
                    # fast closing line instead of asking the model to
                    # improvise a sign-off it was never prompted for.
                    closing_text = random.choice(_CLOSING_MESSAGES)
                    print(f"Assistant (auto-end): {closing_text}")
                    await websocket.send_text(closing_text)

                    tts_audio, sample_rate = await loop.run_in_executor(
                        None, synthesize, closing_text
                    )
                    wav_bytes = pcm_to_wav_bytes(tts_audio, sample_rate)
                    await websocket.send_bytes(wav_bytes)

                    messages.append({"role": "assistant", "content": closing_text})

                    if session_id:
                        save_transcript(session_id, user_id, messages)
                        save_timings(session_id, user_id, timings)

                    # Distinct from __END_TURN__ -- tells the frontend to
                    # stop and navigate to the report once this closing
                    # line finishes playing, instead of resuming the mic.
                    await websocket.send_text("__AUTO_END__")
                    continue

                sentence_queue = pyqueue.Queue()

                def run_llm():
                    for sentence in stream_llm_sentences(messages):
                        sentence_queue.put(sentence)
                    sentence_queue.put(None)

                loop.run_in_executor(None, run_llm)

                full_reply = ""
                while True:
                    sentence = await loop.run_in_executor(None, sentence_queue.get)
                    if sentence is None:
                        break
                    full_reply += sentence + " "
                    await websocket.send_text(sentence)

                    tts_audio, sample_rate = await loop.run_in_executor(
                        None, synthesize, sentence
                    )
                    wav_bytes = pcm_to_wav_bytes(tts_audio, sample_rate)
                    await websocket.send_bytes(wav_bytes)

                messages.append({"role": "assistant", "content": full_reply.strip()})
                print(f"Assistant: {full_reply}")

                question_start_time = time.time()

                if session_id:
                    save_transcript(session_id, user_id, messages)
                    save_timings(session_id, user_id, timings)

                await websocket.send_text("__END_TURN__")

    except WebSocketDisconnect:
        print("Client disconnected")


@app.post("/generate-report")
@limiter.limit("20/hour")
async def generate_report_endpoint(
    request: Request,
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    session = get_session(session_id, user_id)
    if not session:
        return {"error": "Session not found"}

    # Already generated once? Return the saved version instead of
    # re-running the LLM (costs money, and isn't perfectly deterministic
    # -- a second run could differ from what was actually saved).
    if session.get("report"):
        print(f"Returning saved report for session {session_id}")
        return session["report"]

    transcript = session.get("transcript")
    if not transcript:
        return {"error": "No transcript found for this session"}

    # Count real user turns (excluding the system prompt). If the
    # interview ended almost immediately (e.g. the candidate just said
    # "bye" right away), there's genuinely nothing to analyze -- asking
    # the LLM for a full report anyway invites it to invent plausible-
    # sounding questions/answers that never actually happened.
    user_turn_count = sum(1 for m in transcript if m["role"] == "user")
    if user_turn_count < 3:
        return {
            "overall_summary": "The interview ended before enough was said to generate a meaningful analysis.",
            "overall_score": None,
            "strengths": [],
            "areas_to_improve": [],
            "per_question": [],
        }

    timings = session.get("timings") or []

    print(f"Generating report for session {session_id} ({len(transcript)} messages)...")
    loop = asyncio.get_event_loop()

    try:
        report = await asyncio.wait_for(
            loop.run_in_executor(None, generate_report, transcript, timings),
            timeout=45,
        )
        save_report(session_id, user_id, report)
        print(f"Report generated for session {session_id}")
        return report
    except asyncio.TimeoutError:
        print(f"Report generation TIMED OUT for session {session_id}")
        return {"error": "Report generation timed out. Please try again."}
    except Exception as e:
        print(f"Report generation FAILED for session {session_id}: {e}")
        return {"error": "Something went wrong generating the report."}