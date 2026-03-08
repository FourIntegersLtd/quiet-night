"""
Personalized tip for Tonight screen based on last night's sleep.
Uses LLM with structured output; fallback when no API key or parse fails.
24hr cache to avoid redundant LLM calls.
"""

import logging
from typing import Any

from app.cache import cached
from app.llm import parse_chat
from app.llm.schemas import PersonalizedTip

logger = logging.getLogger(__name__)

TIP_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Given the user's LAST NIGHT's sleep data (pre-flight factors, remedy tried, notes, snoring stats), write ONE short, actionable tip for tonight. Focus on one concrete change they could try based on their data. Be warm and encouraging. Output only valid JSON matching the schema."""

TIP_USER_TEMPLATE = """Last night's data:
- Snoring: {snore_mins} minutes ({event_count} events), peak around {peak_time}
- Remedy tried: {remedy}
- Factors: {factors_str}
- Notes: {notes}

Generate one short, actionable tip (1-2 sentences) tailored to this data. Focus on what they could try differently tonight."""


def _fallback_tip() -> str:
    return "Keeping a consistent bedtime helps your body clock. Try to go to bed within the same 30-minute window each night."


def _factors_to_str(factors: dict[str, Any] | None) -> str:
    if not factors:
        return "None provided"
    parts: list[str] = []
    for k, v in factors.items():
        if v is None or v == [] or v == "" or v is False:
            continue
        if isinstance(v, list):
            parts.append(f"{k}: {', '.join(str(x) for x in v)}")
        else:
            parts.append(f"{k}: {v}")
    return "; ".join(parts) if parts else "None provided"


@cached("personalized_tip")
def get_personalized_tip(
    snore_mins: int = 0,
    peak_time: str = "—",
    event_count: int = 0,
    remedy: str | None = None,
    factors: dict[str, Any] | None = None,
    note: str | None = None,
) -> str:
    """
    Return a personalized tip for the Tonight screen based on last night.
    Uses LLM with structured output when OPENAI_API_KEY is set; otherwise fallback.
    """
    factors_str = _factors_to_str(factors) if factors else "None provided"
    notes_str = note or "None"
    remedy_str = remedy or "—"

    user_prompt = TIP_USER_TEMPLATE.format(
        snore_mins=snore_mins,
        peak_time=peak_time or "—",
        event_count=event_count,
        remedy=remedy_str,
        factors_str=factors_str,
        notes=notes_str,
    )
    parsed = parse_chat(
        TIP_SYSTEM,
        user_prompt,
        PersonalizedTip,
        temperature=0.5,
        max_tokens=200,
    )
    if not parsed:
        logger.info("[tip] Using fallback personalized tip")
        return _fallback_tip()
    return parsed.tip
