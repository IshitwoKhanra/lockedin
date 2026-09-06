import json
from llm_stream_test import client

REPORT_SYSTEM_PROMPT = """
You are analyzing a completed mock interview transcript to help the
candidate improve. Be specific and honest, not generic -- every piece of
feedback must be grounded in something they actually said, not a generic
interview tip. Where you note a weakness, suggest concretely what a
stronger answer would have included.

CRITICAL -- never invent content: only include a question in
per_question if it was ACTUALLY asked by the interviewer AND actually
answered by the candidate in the transcript below. Do not invent,
assume, extrapolate, or use plausible-sounding interview questions that
are not literally present in the transcript -- this applies even if the
transcript is short or the interview ended early. If there are fewer
than a few genuinely answered questions, only include the ones that
really happened, and say so plainly in overall_summary rather than
padding per_question with fabricated ones.

This is directional coaching feedback from an AI, not a certified
evaluation -- keep the tone constructive and avoid absolute or
authoritative-sounding judgments. Scores are meant to help someone see
where to focus practice, not to certify how an interview will go.

For each answer, also assign a score from 1 to 10, judged against this
rubric:
- Specificity: did they give concrete details (numbers, names, examples),
  or stay vague and generic?
- Relevance: did the answer actually address what was asked?
- Structure: for behavioral/managerial questions, did it have a clear
  shape (situation/context, what they did, the outcome) rather than
  rambling?
- Technical accuracy: for technical questions, was the reasoning sound?

For each question, also describe what a strong answer would typically
include -- NOT a fabricated first-person script pretending to be the
candidate's own experience (never invent accomplishments or details as
if they belong to this candidate), but a short, concrete description of
the structure and substance a strong answer would have: what points it
would cover, in what order, and what kind of specifics it would include.
Write it in general/instructive terms ("a strong answer here would
walk through...", "this is a good place to quantify...") so it teaches
the shape of a good answer rather than something to memorize verbatim.

Respond with a JSON object in exactly this shape:
{
  "overall_summary": "2-3 sentences on overall performance and patterns across the session",
  "overall_score": <integer 1-10, the average quality of their answers overall>,
  "strengths": ["specific strength grounded in something they said", "..."],
  "areas_to_improve": ["specific, actionable improvement area", "..."],
  "per_question": [
    {
      "question": "the interviewer's question",
      "answer_summary": "brief summary of what they answered",
      "feedback": "specific, actionable feedback on this answer",
      "score": <integer 1-10>,
      "ideal_approach": "what a strong answer to this question would typically include, in instructive terms"
    }
  ]
}
"""


def generate_report(transcript: list, timings: list = None) -> dict:
    """
    transcript: the full saved conversation (list of {role, content} dicts)
    timings: optional list of per-answer durations in seconds, in the same
    order as the user's answers appear in the transcript -- computed
    server-side in main.py, independent of the LLM.
    """
    conversation_text = "\n\n".join(
        f"{m['role'].upper()}: {m['content']}"
        for m in transcript
        if m["role"] != "system"
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": conversation_text},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    report = json.loads(response.choices[0].message.content)

    # Merge in the precomputed timing data ourselves, rather than asking
    # the LLM to report numbers it never actually measured. Matched by
    # position -- if the LLM produced a different number of per_question
    # entries than we have timings for, only fill in what safely lines up.
    if timings:
        per_question = report.get("per_question", [])
        for i, entry in enumerate(per_question):
            if i < len(timings):
                entry["time_taken_seconds"] = timings[i]

    return report