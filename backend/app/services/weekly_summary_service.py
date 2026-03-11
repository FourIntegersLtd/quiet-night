"""
Weekly AI summary for Journey/Tonight: aggregate last 7 days vs previous 7,
compute snoring change %, top remedy, partner rate; LLM one-sentence summary.
"""

from datetime import datetime, timedelta
import logging

from app.llm import parse_chat
from app.llm.schemas import WeeklySummarySummary

logger = logging.getLogger(__name__)

WEEKLY_SYSTEM = """You are a supportive sleep coach for the QuietNight app. Write one or two short, encouraging sentences for the "This week" card. Reference the user's actual stats: snoring change vs last week, top performing remedy if any, partner sleep quality if provided. Be warm and specific. Output only valid JSON matching the schema."""


def _week_bounds(days_back: int = 0) -> tuple[str, str]:
    """Return (date_from, date_to) for a 7-day window. days_back=0 → last 7 days ending yesterday."""
    yesterday = datetime.utcnow().date() - timedelta(days=1)
    end = yesterday - timedelta(days=days_back)
    start = end - timedelta(days=6)
    return start.isoformat(), end.isoformat()


def _aggregate_sessions(sessions: list[dict]) -> dict:
    """From merged session list: total loud_mins, by remedy, partner reports."""
    total_mins = 0.0
    nights = 0
    by_remedy: dict[str, list[float]] = {}
    partner_good = 0
    partner_total = 0
    for s in sessions:
        lm = s.get("loud_snore_minutes")
        if lm is not None:
            total_mins += float(lm)
            nights += 1
        remedy = (s.get("remedy_type") or "BASELINE").strip() or "BASELINE"
        if remedy not in by_remedy:
            by_remedy[remedy] = []
        if lm is not None:
            by_remedy[remedy].append(float(lm))
        pr = s.get("partner_report")
        if pr in ("good", "bad"):
            partner_total += 1
            if pr == "good":
                partner_good += 1
    avg_mins = total_mins / nights if nights else 0
    return {
        "avg_snore_mins": round(avg_mins, 1),
        "nights": nights,
        "by_remedy": by_remedy,
        "partner_good_pct": round(100 * partner_good / partner_total, 0) if partner_total else None,
        "partner_nights": partner_total,
    }


def _top_remedy(by_remedy: dict[str, list[float]], baseline_avg: float | None) -> tuple[str | None, float | None]:
    """Best non-baseline remedy by average reduction vs baseline. Returns (remedy_name, reduction_pct)."""
    if baseline_avg is None or baseline_avg <= 0:
        return None, None
    best_remedy = None
    best_reduction: float | None = None
    for remedy, mins_list in by_remedy.items():
        if remedy == "BASELINE" or not mins_list:
            continue
        avg = sum(mins_list) / len(mins_list)
        reduction = ((baseline_avg - avg) / baseline_avg) * 100
        if best_reduction is None or reduction > best_reduction:
            best_reduction = round(reduction, 0)
            best_remedy = remedy.replace("_", " ").title()
    return best_remedy, best_reduction


def get_weekly_summary(
    user_id: str,
    session_service,
    user_name: str | None = None,
) -> dict:
    """
    Return a short "This week" summary: summary sentence, snoring_change_pct, top_remedy.
    Uses last 7 days vs previous 7 days. Cached 24h per user.
    """
    date_from_this, date_to_this = _week_bounds(0)
    date_from_prev, date_to_prev = _week_bounds(7)
    this_week = session_service.list_sessions(
        user_id, date_from=date_from_this, date_to=date_to_this, limit=14
    )
    prev_week = session_service.list_sessions(
        user_id, date_from=date_from_prev, date_to=date_to_prev, limit=14
    )
    agg_this = _aggregate_sessions(this_week)
    agg_prev = _aggregate_sessions(prev_week)
    snoring_change_pct: int | None = None
    if agg_prev["avg_snore_mins"] > 0 and agg_this["nights"] > 0:
        change = (
            (agg_prev["avg_snore_mins"] - agg_this["avg_snore_mins"])
            / agg_prev["avg_snore_mins"]
            * 100
        )
        snoring_change_pct = round(change)
    baseline_avg = None
    if "BASELINE" in agg_this["by_remedy"] and agg_this["by_remedy"]["BASELINE"]:
        baseline_avg = sum(agg_this["by_remedy"]["BASELINE"]) / len(
            agg_this["by_remedy"]["BASELINE"]
        )
    if baseline_avg is None and agg_prev["nights"] > 0:
        baseline_avg = agg_prev["avg_snore_mins"]
    top_remedy, top_reduction = _top_remedy(agg_this["by_remedy"], baseline_avg)
    user_prompt = f"""User's name: {user_name or 'there'}
This week (last 7 days): {agg_this['nights']} nights, avg snoring {agg_this['avg_snore_mins']} min.
Previous week: {agg_prev['nights']} nights, avg snoring {agg_prev['avg_snore_mins']} min.
Snoring change vs last week: {snoring_change_pct}% (positive = improvement).
Top performing remedy this week: {top_remedy or 'none'} ({top_reduction}% reduction vs baseline) if relevant.
Partner sleep quality (good %): {agg_this['partner_good_pct']}% over {agg_this['partner_nights']} reports (omit if 0).

Write a brief, encouraging 1-2 sentence summary for the "This week" card. Use the numbers above. Be specific and warm."""
    parsed = parse_chat(
        WEEKLY_SYSTEM,
        user_prompt,
        WeeklySummarySummary,
        temperature=0.5,
        max_tokens=200,
    )
    if not parsed:
        if agg_this["nights"] == 0:
            summary = "Record a few nights this week to see your weekly summary here."
        elif snoring_change_pct is not None and snoring_change_pct > 0:
            summary = f"This week: snoring down {snoring_change_pct}% vs last week."
            if top_remedy:
                summary += f" Top performer: {top_remedy}."
        elif snoring_change_pct is not None and snoring_change_pct < 0:
            summary = f"This week: snoring up {abs(snoring_change_pct)}% vs last week. Try a different remedy or add a baseline night to compare."
        else:
            summary = f"You logged {agg_this['nights']} nights this week. Keep tracking to see trends."
        logger.info("[weekly_summary] Using fallback")
    else:
        summary = parsed.summary
    return {
        "summary": summary,
        "snoring_change_pct": snoring_change_pct,
        "top_remedy": top_remedy,
    }
