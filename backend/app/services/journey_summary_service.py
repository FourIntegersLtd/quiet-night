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

BEST_REMEDY_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Given the user's remedy leaderboard (remedy name, nights tracked, % reduction in loud snoring vs baseline), produce a short, warm summary for the "Your best remedy" card. Be concise and encouraging. Output only valid JSON matching the schema."""

BEST_REMEDY_USER_TEMPLATE = """Leaderboard data (remedy, nights, reduction % vs baseline):
{context}

Generate a brief summary for their best remedy card."""


def _fallback_best_remedy(leaderboard: list[dict[str, Any]]) -> dict[str, str]:
    """Build a non-LLM fallback when no API key or parse fails."""
    best = None
    for row in leaderboard:
        reduction = row.get("reduction")
        if reduction is not None and (best is None or reduction > best.get("reduction", 0)):
            best = row
    if not best:
        return {
            "title": "Your best remedy",
            "remedy_name": "—",
            "summary": "Track nights from the Tonight tab and try different remedies. Your best option will appear here once you have enough data.",
            "recommendation": "Keep tracking to compare over time.",
        }
    return {
        "title": "Your best remedy so far",
        "remedy_name": best.get("remedy", "—"),
        "summary": f"This is your most effective remedy so far with {best.get('reduction', 0)}% less loud snoring vs baseline over {best.get('nights', 0)} night(s).",
        "recommendation": "Keep tracking to compare over time.",
    }


@cached("best_remedy_summary")
def get_best_remedy_summary(leaderboard: list[dict[str, Any]]) -> dict[str, str]:
    """
    Return a structured "best remedy" summary for the Journey screen.
    Uses LLM when OPENAI_API_KEY is set; otherwise returns fallback.
    leaderboard: list of { "remedy": str, "nights": int, "reduction": int | null }
    """
    if not leaderboard:
        return _fallback_best_remedy([])
    context = "\n".join(
        f"- {r.get('remedy', '—')}: {r.get('nights', 0)} nights, {r.get('reduction') if r.get('reduction') is not None else 'N/A'}% reduction"
        for r in leaderboard[:10]
    )
    user_prompt = BEST_REMEDY_USER_TEMPLATE.format(context=context)
    parsed = parse_chat(
        BEST_REMEDY_SYSTEM,
        user_prompt,
        BestRemedySummary,
        temperature=0.5,
        max_tokens=800,
    )
    if not parsed:
        logger.info("[journey_summary] Using fallback best-remedy summary")
        return _fallback_best_remedy(leaderboard)
    return {
        "title": parsed.title,
        "remedy_name": parsed.remedy_name,
        "summary": parsed.summary,
        "recommendation": parsed.recommendation,
    }
