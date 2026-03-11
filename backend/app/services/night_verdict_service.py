"""
Night verdict: "Did it work?" for a single night — verdict + reason + what to try next.
Uses this night's snore_mins vs user baseline; LLM for reason and suggest_next_reason.
"""

import logging
from typing import Any

from app.llm import parse_chat
from app.llm.schemas import NightVerdictSummary

logger = logging.getLogger(__name__)

NIGHT_VERDICT_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Write a short, warm reason (1-2 sentences) for the verdict. Use the user's name when given so it feels personal. Never use generic phrasing; reference their actual numbers and remedy. If we suggest a next remedy, write one short sentence why. Be non-judgmental and supportive. Output only valid JSON matching the schema."""


def _compute_verdict(
    snore_mins: float,
    remedy: str | None,
    baseline_avg: float | None,
    partner_report: str | None,
) -> str:
    """Rule-based verdict: worked / unclear / didnt_work."""
    remedy_upper = (remedy or "").strip().upper()
    if remedy_upper == "BASELINE" or not remedy_upper:
        return "unclear"
    if baseline_avg is None or baseline_avg <= 0:
        if snore_mins <= 12:
            return "worked"
        if snore_mins >= 20:
            return "didnt_work"
        return "unclear"
    ratio = snore_mins / baseline_avg
    if partner_report == "bad":
        return "didnt_work"
    if ratio <= 0.7:
        return "worked"
    if ratio >= 1.2:
        return "didnt_work"
    return "unclear"


def get_night_verdict(
    user_id: str,
    night_key: str,
    snore_mins: float,
    remedy: str | None,
    partner_report: str | None,
    session_service: Any,
    auth_service: Any,
) -> dict[str, Any]:
    """
    Return verdict (worked/unclear/didnt_work), reason, suggest_next, suggest_next_reason.
    Baseline from user's sessions; suggest_next from recommendation_service; LLM for copy.
    """
    from app.services import recommendation_service as rec_svc  # lazy to avoid circular import

    user_name = auth_service.get_display_name(user_id) if auth_service else None
    sessions = session_service.list_sessions(user_id, limit=200)
    baseline_list: list[float] = []
    for s in sessions:
        if (s.get("remedy_type") or "").strip().upper() == "BASELINE":
            mins = s.get("loud_snore_minutes")
            if mins is not None:
                baseline_list.append(float(mins))
    baseline_avg = sum(baseline_list) / len(baseline_list) if baseline_list else None
    verdict = _compute_verdict(snore_mins, remedy, baseline_avg, partner_report)
    rec = rec_svc.get_next_recommendation(user_id, session_service, auth_service)
    suggest_remedy = rec.get("suggested_remedy")
    suggest_reason = rec.get("reason", "")

    leaderboard = rec_svc._build_leaderboard(sessions)
    leaderboard_lines = [
        f"- {r['remedy']}: {r['nights']} nights, avg {r['avg_mins']} min snoring, {r['reduction'] if r.get('reduction') is not None else 'N/A'}% reduction vs baseline"
        for r in leaderboard[:15]
    ]
    leaderboard_context = "\n".join(leaderboard_lines) if leaderboard_lines else "No previous experiments yet."

    user_prompt = f"""User's name (use naturally in your reply): {user_name or 'there'}
This night: {snore_mins} minutes loud snoring, remedy used: {remedy or '—'}, partner report: {partner_report or '—'}.
User baseline average (from other nights): {baseline_avg if baseline_avg is not None else 'no baseline yet'} minutes.
Verdict we computed: {verdict}.
Suggested next remedy to try: {suggest_remedy or '—'}.

Previous experiments (remedy leaderboard, same format as Journey):
{leaderboard_context}

Write a brief reason for the verdict (1-2 sentences, compare to baseline and their experiment history when relevant, warm tone). Address them by name. Then one short sentence for why to try the suggested remedy next (or null if no suggestion)."""

    parsed = parse_chat(
        NIGHT_VERDICT_SYSTEM,
        user_prompt,
        NightVerdictSummary,
        temperature=0.5,
        max_tokens=350,
    )
    if parsed:
        return {
            "verdict": parsed.verdict or verdict,
            "reason": parsed.reason,
            "suggest_next": parsed.suggest_next if parsed.suggest_next is not None else suggest_remedy,
            "suggest_next_reason": parsed.suggest_next_reason if parsed.suggest_next_reason is not None else (suggest_reason or None),
        }
    return {
        "verdict": verdict,
        "reason": _fallback_reason(verdict, snore_mins, baseline_avg, remedy, user_name),
        "suggest_next": suggest_remedy,
        "suggest_next_reason": suggest_reason or None,
    }


def _fallback_reason(
    verdict: str,
    snore_mins: float,
    baseline_avg: float | None,
    remedy: str | None,
    user_name: str | None = None,
) -> str:
    name = (user_name or "").strip() or None
    prefix = f"{name}, " if name else ""
    if verdict == "worked":
        if baseline_avg and baseline_avg > 0:
            pct = round((1 - snore_mins / baseline_avg) * 100)
            return f"{prefix}Loud snoring was {snore_mins:.0f} min vs your baseline {baseline_avg:.0f} min — about {pct}% less. This looks promising."
        return f"{prefix}Only {snore_mins:.0f} min of loud snoring. Keep tracking to see how it holds up."
    if verdict == "didnt_work":
        if baseline_avg and baseline_avg > 0:
            return f"{prefix}Snoring was higher than your baseline ({snore_mins:.0f} min vs ~{baseline_avg:.0f} min). Try a few more nights or a different approach."
        return f"{prefix}Snoring was {snore_mins:.0f} min. Consider trying another remedy or a few more nights."
    return f"{prefix}Results are close to your baseline. Try a few more nights with this remedy or switch to compare."


def compute_and_store_verdict(
    user_id: str,
    night_key: str,
    snore_mins: float,
    remedy: str | None,
    partner_report: str | None,
    session_service: Any,
    auth_service: Any,
) -> dict[str, Any]:
    """
    Compute verdict, persist on the session row (backend source of truth), and return the result.
    Single entry point for POST /insights/night-verdict.
    """
    night_key_normalized = night_key.strip().replace("night_", "")
    result = get_night_verdict(
        user_id=user_id,
        night_key=night_key_normalized,
        snore_mins=snore_mins,
        remedy=remedy,
        partner_report=partner_report,
        session_service=session_service,
        auth_service=auth_service,
    )
    session_service.update_session_verdict(
        user_id=user_id,
        night_key=night_key,
        verdict=result["verdict"],
        verdict_reason=result["reason"],
        suggest_next=result.get("suggest_next"),
        suggest_next_reason=result.get("suggest_next_reason"),
    )
    return result
