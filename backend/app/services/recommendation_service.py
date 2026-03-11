"""
Recommendation engine: suggest next remedy to try (clinically-informed order + LLM reason).
Uses sessions + onboarding remedies_tried; optional LLM for reason and alternatives.
"""

import logging
from typing import Any

from app.llm import parse_chat
from app.llm.schemas import AllTriedReasonSummary, RecommendationNextSummary

logger = logging.getLogger(__name__)

# Clinically-informed order: nasal -> positional -> oral -> environmental -> other -> CPAP. BASELINE excluded.
REMEDY_ORDER: list[str] = [
    "NASAL_STRIPS",
    "NASAL_DILATOR",
    "NASAL_SPRAY",
    "SIDE_SLEEPING",
    "WEDGE_PILLOW",
    "MOUTH_TAPE",
    "TONGUE_RETAINER",
    "MOUTHPIECE",
    "HUMIDIFIER",
    "AIR_PURIFIER",
    "NO_ALCOHOL",
    "THROAT_SPRAY",
    "ANTI_HISTAMINES",
    "ANTI_SNORE_PILLOW",
    "CHIN_STRAP",
    "CPAP",
]

RECOMMENDATION_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Write a short, encouraging reason (1-2 sentences) why to try the suggested remedy next. Use the user's name when given so it feels personal. Never use generic phrasing; reference their actual leaderboard (what they've tried, how it went). Optionally suggest 1-2 alternative remedies with brief reasons. Only suggest remedies from the list we give you; do not recommend something they have already tried. Be warm and specific. Output only valid JSON matching the schema."""

ALL_TRIED_SYSTEM = """You are a supportive sleep coach for the QuietNight app. The user has already tried all the remedies on our list. Use their name when given. Acknowledge this clearly and warmly. In 1-3 sentences: affirm their effort personally, suggest focusing on their best-performing remedy or consistency, and optionally mention retrying for more nights or discussing options with a healthcare provider. No generic messages. Output only valid JSON with a single "reason" field (string)."""


def _build_leaderboard(sessions: list[dict]) -> list[dict[str, Any]]:
    """Compute per-remedy stats and reduction vs baseline. Sessions have remedy_type, loud_snore_minutes."""
    by_remedy: dict[str, list[float]] = {}
    for s in sessions:
        remedy = (s.get("remedy_type") or "BASELINE").strip().upper()
        mins = s.get("loud_snore_minutes")
        if mins is not None:
            by_remedy.setdefault(remedy, []).append(float(mins))
    baseline_list = by_remedy.get("BASELINE", [])
    baseline_avg = sum(baseline_list) / len(baseline_list) if baseline_list else None
    leaderboard: list[dict[str, Any]] = []
    for remedy, mins_list in by_remedy.items():
        if remedy == "BASELINE":
            continue
        avg = sum(mins_list) / len(mins_list)
        reduction: int | None = None
        if baseline_avg is not None and baseline_avg > 0:
            reduction = round((1 - avg / baseline_avg) * 100)
        leaderboard.append(
            {
                "remedy": remedy,
                "nights": len(mins_list),
                "avg_mins": round(avg, 1),
                "reduction": reduction,
            }
        )
    return leaderboard


def _tried_remedies_from_sessions(sessions: list[dict]) -> set[str]:
    """All remedy_type values from sessions (excluding BASELINE). Ensures we never suggest something already tracked."""
    out: set[str] = set()
    for s in sessions:
        r = (s.get("remedy_type") or "").strip().upper()
        if r and r != "BASELINE":
            out.add(r)
    return out


def _pick_next_remedy(
    leaderboard: list[dict],
    tried_set: set[str],
    min_nights_to_retest: int = 2,
) -> str | None:
    """
    Pick next remedy: first in REMEDY_ORDER that is not in tried_set, or has < min_nights (retest).
    If every remedy has been tried (and has enough nights), return None so caller can show "all tried" message.
    """
    by_remedy = {row["remedy"]: row for row in leaderboard}
    for remedy in REMEDY_ORDER:
        if remedy == "BASELINE":
            continue
        row = by_remedy.get(remedy)
        nights = row["nights"] if row else 0
        if remedy not in tried_set:
            return remedy
        if remedy in tried_set and nights < min_nights_to_retest:
            return remedy
    return None


def get_next_recommendation(
    user_id: str,
    session_service: Any,
    auth_service: Any,
) -> dict[str, Any]:
    """
    Return suggested next remedy + LLM-generated reason (and optional alternatives).
    Uses all sessions for leaderboard and tried set; onboarding remedies_tried merged in.
    Never suggests a remedy already tried unless retesting with few nights. If all tried, returns reason only.
    """
    sessions = session_service.list_sessions(user_id, limit=200)
    leaderboard = _build_leaderboard(sessions)
    tried_from_sessions = _tried_remedies_from_sessions(sessions)
    user_name = auth_service.get_display_name(user_id) if auth_service else None
    ob = auth_service.get_onboarding_responses(user_id)
    tried_from_onboarding: set[str] = set()
    if isinstance(ob, dict) and "remedies_tried" in ob:
        rt = ob["remedies_tried"]
        if isinstance(rt, list):
            tried_from_onboarding = {str(x).strip().upper() for x in rt if x}
    tried_set = tried_from_sessions | tried_from_onboarding
    suggested = _pick_next_remedy(leaderboard, tried_set)

    if suggested is None:
        context_lines = [
            f"- {r['remedy']}: {r['nights']} nights, avg {r['avg_mins']} min snoring, {r['reduction']}% reduction vs baseline"
            for r in leaderboard[:15]
        ]
        if not context_lines:
            context_lines = ["No remedy data yet."]
        user_prompt = (
            f"User's name (use naturally): {user_name or 'there'}\n\n"
            "The user has already tried all remedies on our list (or has tracked many nights across them).\n\n"
            "Leaderboard:\n"
            + "\n".join(context_lines)
            + "\n\nAcknowledge that they have tried everything on the list. Address them by name and give a short, warm, personal message—no generic phrasing."
        )
        parsed = parse_chat(
            ALL_TRIED_SYSTEM,
            user_prompt,
            AllTriedReasonSummary,
            temperature=0.5,
            max_tokens=300,
        )
        reason = (
            parsed.reason
            if parsed
            else (
                f"{user_name}, you've tried a lot already. Focus on what's working best for you, or consider a few more nights with your top remedy to confirm."
                if user_name
                else "You've tried a lot already. Focus on what's working best for you, or consider a few more nights with your top remedy to confirm."
            )
        )
        return {
            "suggested_remedy": None,
            "reason": reason,
            "alternatives": [],
        }

    context_lines = [
        f"- {r['remedy']}: {r['nights']} nights, avg {r['avg_mins']} min snoring, {r['reduction']}% reduction vs baseline"
        for r in leaderboard[:15]
    ]
    if not context_lines:
        context_lines = ["No remedy data yet; user has only baseline or no sessions."]
    tried_list = sorted(tried_set) if tried_set else []
    user_prompt = (
        f"User's name (use naturally): {user_name or 'there'}\n\n"
        "Leaderboard:\n"
        + "\n".join(context_lines)
        + f"\n\nAlready tried (do not suggest these): {', '.join(tried_list) or 'none'}"
        + f"\n\nSuggested next remedy to try: {suggested}\n\n"
        "Write a brief reason (1-2 sentences) why this is a good next step for this person. Address them by name. Optionally suggest 1-2 alternatives from the remedy list that are NOT in the 'already tried' list, with one sentence each. No generic messages."
    )
    parsed = parse_chat(
        RECOMMENDATION_SYSTEM,
        user_prompt,
        RecommendationNextSummary,
        temperature=0.5,
        max_tokens=400,
    )
    if parsed:
        return {
            "suggested_remedy": parsed.suggested_remedy or suggested,
            "reason": parsed.reason,
            "alternatives": [
                {"remedy": a.remedy, "reason": a.reason}
                for a in (parsed.alternatives or [])[:2]
            ],
        }
    reason = f"Try {suggested.replace('_', ' ').lower()} next — a good next step based on your tracking so far."
    if user_name:
        reason = f"{user_name}, {reason[0].lower()}{reason[1:]}"
    return {
        "suggested_remedy": suggested,
        "reason": reason,
        "alternatives": [],
    }
