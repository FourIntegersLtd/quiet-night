"""
Journey summaries (e.g. "Your best remedy") via central LLM client.
Returns structured summary or fallback when no API key or parse fails.
24hr cache to avoid redundant LLM calls.
"""

import logging
from typing import Any

from app.cache import cached
from app.llm import parse_chat
from app.llm.schemas import BestRemedySummary

logger = logging.getLogger(__name__)

BEST_REMEDY_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Produce a short, warm summary for the "Your best remedy" card. Use the user's name when given so it feels personal. Never use generic phrasing; reference their actual remedy and numbers. Be concise and encouraging. Output only valid JSON matching the schema."""

BEST_REMEDY_USER_TEMPLATE = """User's name (use naturally): {user_name}
Leaderboard data (remedy, nights, reduction % vs baseline):
{context}

Generate a brief summary for their best remedy card. Address them by name; no generic messages."""


def _fallback_best_remedy(leaderboard: list[dict[str, Any]], user_name: str | None = None) -> dict[str, str]:
    """Build a non-LLM fallback when no API key or parse fails."""
    name = (user_name or "").strip() or None
    prefix = f"{name}, " if name else ""
    best = None
    for row in leaderboard:
        reduction = row.get("reduction")
        if reduction is not None and (best is None or reduction > best.get("reduction", 0)):
            best = row
    if not best:
        return {
            "title": "Your best remedy",
            "remedy_name": "—",
            "summary": f"{prefix}Track nights from the Tonight tab and try different remedies. Your best option will appear here once you have enough data.",
            "recommendation": "Keep tracking to compare over time.",
        }
    return {
        "title": "Your best remedy so far",
        "remedy_name": best.get("remedy", "—"),
        "summary": f"{prefix}This is your most effective remedy so far with {best.get('reduction', 0)}% less loud snoring vs baseline over {best.get('nights', 0)} night(s).",
        "recommendation": "Keep tracking to compare over time.",
    }


@cached("best_remedy_summary")
def get_best_remedy_summary(leaderboard: list[dict[str, Any]], user_name: str | None = None) -> dict[str, str]:
    """
    Return a structured "best remedy" summary for the Journey screen.
    Uses LLM when OPENAI_API_KEY is set; otherwise returns fallback.
    leaderboard: list of { "remedy": str, "nights": int, "reduction": int | null }
    """
    if not leaderboard:
        return _fallback_best_remedy([], user_name)
    context = "\n".join(
        f"- {r.get('remedy', '—')}: {r.get('nights', 0)} nights, {r.get('reduction') if r.get('reduction') is not None else 'N/A'}% reduction"
        for r in leaderboard[:10]
    )
    user_prompt = BEST_REMEDY_USER_TEMPLATE.format(user_name=user_name or "there", context=context)
    parsed = parse_chat(
        BEST_REMEDY_SYSTEM,
        user_prompt,
        BestRemedySummary,
        temperature=0.5,
        max_tokens=800,
    )
    if not parsed:
        logger.info("[journey_summary] Using fallback best-remedy summary")
        return _fallback_best_remedy(leaderboard, user_name)
    return {
        "title": parsed.title,
        "remedy_name": parsed.remedy_name,
        "summary": parsed.summary,
        "recommendation": parsed.recommendation,
    }
