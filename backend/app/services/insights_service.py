"""
Night insights for the morning screen: LLM-generated short summary of last night.
Uses central parse_chat; fallback when no API key or parse fails.
24hr cache to avoid redundant LLM calls.
"""

import logging

from app.cache import cached
from app.llm import parse_chat
from app.llm.schemas import NightInsightSummary

logger = logging.getLogger(__name__)

NIGHT_INSIGHT_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Given last night's stats (loud snoring minutes, peak time, remedy used), write one or two short, encouraging sentences for the "Night Insights" card. Be warm and non-judgmental. Mention peak time and the remedy if relevant. Output only valid JSON matching the schema."""

NIGHT_INSIGHT_USER_TEMPLATE = """Last night:
- Loud snoring: {snore_mins} minutes ({event_count} events)
- Peak snoring time: {peak_time}
- Remedy used: {remedy_name}

Write a brief, encouraging summary (1-2 sentences) for the morning screen."""


def _fallback_night_insight(
    snore_mins: int,
    peak_time: str,
    remedy_name: str,
) -> str:
    if snore_mins == 0:
        return "No snoring detected last night. Your partner's report will appear on the Journey tab once you're linked."
    if snore_mins <= 12 and remedy_name != "—":
        return f"Peak snoring was around {peak_time}. Under 12 minutes—{remedy_name} looks promising."
    if snore_mins <= 12:
        return f"Peak snoring was around {peak_time}. Under 12 minutes of loud snoring."
    return f"Peak snoring was around {peak_time}. {snore_mins} mins detected. When you link with your partner, their sleep report will show on your Journey."


@cached("night_insight")
def get_night_insight(
    snore_mins: int,
    peak_time: str,
    remedy_name: str,
    event_count: int = 0,
) -> str:
    """
    Return a short "Night Insights" summary for the morning screen.
    Uses LLM when OPENAI_API_KEY is set; otherwise returns fallback.
    """
    user_prompt = NIGHT_INSIGHT_USER_TEMPLATE.format(
        snore_mins=snore_mins,
        peak_time=peak_time or "—",
        remedy_name=remedy_name or "—",
        event_count=event_count,
    )
    parsed = parse_chat(
        NIGHT_INSIGHT_SYSTEM,
        user_prompt,
        NightInsightSummary,
        temperature=0.5,
        max_tokens=300,
    )
    if not parsed:
        logger.info("[insights] Using fallback night insight")
        return _fallback_night_insight(snore_mins, peak_time or "—", remedy_name or "—")
    return parsed.summary
