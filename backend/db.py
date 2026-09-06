import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# One shared client, created once at import time -- same principle as
# every other "load once, reuse everywhere" pattern in this project
# (Whisper, Piper, the OpenAI client). Uses the SERVICE ROLE key, which
# bypasses Row Level Security -- appropriate here because the backend
# has already verified WHO the user is (via auth.py) before ever calling
# these functions, and explicitly filters every query by that user_id
# itself, rather than relying on RLS to do it for a request it can't see.
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def create_session(user_id: str, resume_text: str) -> str:
    """Creates a new session row, returns its id."""
    result = supabase.table("sessions").insert({
        "user_id": user_id,
        "resume_text": resume_text,
        "transcript": [],
        "timings": [],
    }).execute()
    return result.data[0]["id"]


def get_session(session_id: str, user_id: str) -> dict | None:
    """Fetches a session row, but ONLY if it belongs to user_id -- this
    explicit check is what actually enforces "you can only touch your
    own sessions" on the backend side, since RLS is bypassed here."""
    result = (
        supabase.table("sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def get_resume_text(session_id: str, user_id: str) -> str | None:
    session = get_session(session_id, user_id)
    return session["resume_text"] if session else None


def get_transcript(session_id: str, user_id: str) -> list | None:
    session = get_session(session_id, user_id)
    return session["transcript"] if session else None


def get_timings(session_id: str, user_id: str) -> list | None:
    session = get_session(session_id, user_id)
    return session["timings"] if session else None


def save_transcript(session_id: str, user_id: str, transcript: list):
    supabase.table("sessions").update({"transcript": transcript}).eq(
        "id", session_id
    ).eq("user_id", user_id).execute()


def save_timings(session_id: str, user_id: str, timings: list):
    supabase.table("sessions").update({"timings": timings}).eq(
        "id", session_id
    ).eq("user_id", user_id).execute()


def save_report(session_id: str, user_id: str, report: dict):
    supabase.table("sessions").update({"report": report}).eq(
        "id", session_id
    ).eq("user_id", user_id).execute()


def get_latest_resume_text(user_id: str) -> str | None:
    """The resume_text from the user's most recent session, if they have
    one -- used for the "continue with previous resume" option."""
    result = (
        supabase.table("sessions")
        .select("resume_text")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["resume_text"]
    return None


def get_user_sessions(user_id: str) -> list:
    """All sessions belonging to a user, newest first -- what the
    Past Interviews page will list."""
    result = (
        supabase.table("sessions")
        .select("id, resume_text, report, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data