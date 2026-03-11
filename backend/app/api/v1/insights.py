"""Insights: night summary (LLM) for morning screen, personalized tip, night verdict."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_id, get_session_service, get_auth_service
from app.models.schemas import (
    NightInsightsRequest,
    NightInsightsResponse,
    NightVerdictRequest,
    NightVerdictResponse,
    PersonalizedTipRequest,
    PersonalizedTipResponse,
    WeeklySummaryResponse,
)
from app.services.insights_service import get_night_insight
from app.services.tip_service import get_personalized_tip
from app.services.night_verdict_service import compute_and_store_verdict
from app.services.weekly_summary_service import get_weekly_summary
from app.services.session_service import SessionService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("/night", response_model=NightInsightsResponse)
def post_night_insights(
    body: NightInsightsRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    """
    Get a short LLM-generated "Night Insights" summary for the morning screen.
    Send last night's stats; returns summary or fallback. Uses user's name from onboarding/profile.
    """
    user_name = auth_service.get_display_name(user_id)
    summary = get_night_insight(
        snore_mins=body.snore_mins,
        peak_time=body.peak_time,
        remedy_name=body.remedy_name,
        event_count=body.event_count,
        user_name=user_name,
    )
    return NightInsightsResponse(summary=summary)


@router.post("/personalized-tip", response_model=PersonalizedTipResponse)
def post_personalized_tip(
    body: PersonalizedTipRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    """
    Get a personalized tip for the Tonight screen based on last night's sleep.
    Uses user's name from onboarding/profile for personalisation.
    """
    factors_dict = None
    note = None
    if body.factors:
        factors_dict = body.factors.model_dump(exclude_none=True)
        note = body.factors.note
    user_name = auth_service.get_display_name(user_id)
    tip = get_personalized_tip(
        snore_mins=body.snore_mins,
        peak_time=body.peak_time,
        event_count=body.event_count,
        remedy=body.remedy,
        factors=factors_dict,
        note=note,
        user_name=user_name,
    )
    return PersonalizedTipResponse(tip=tip)


@router.post("/night-verdict", response_model=NightVerdictResponse)
def post_night_verdict(
    body: NightVerdictRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session_service: Annotated[SessionService, Depends(get_session_service)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    """
    Compute and store "Did it work?" verdict for this night (backend source of truth).
    Call when the user ends a recording session; verdict is saved on the session row.
    """
    result = compute_and_store_verdict(
        user_id=user_id,
        night_key=body.night_key,
        snore_mins=body.snore_mins,
        remedy=body.remedy,
        partner_report=body.partner_report,
        session_service=session_service,
        auth_service=auth_service,
    )
    return NightVerdictResponse(
        verdict=result["verdict"],
        reason=result["reason"],
        suggest_next=result.get("suggest_next"),
        suggest_next_reason=result.get("suggest_next_reason"),
    )


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def get_weekly_summary_route(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session_service: Annotated[SessionService, Depends(get_session_service)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    """
    Get a short "This week" summary: snoring change vs last week, top remedy, one-sentence LLM summary.
    Used by Journey or Tonight "This week" card.
    """
    user_name = auth_service.get_display_name(user_id)
    result = get_weekly_summary(
        user_id=user_id,
        session_service=session_service,
        user_name=user_name,
    )
    return WeeklySummaryResponse(
        summary=result["summary"],
        snoring_change_pct=result.get("snoring_change_pct"),
        top_remedy=result.get("top_remedy"),
    )


@router.get("/night-verdict", response_model=NightVerdictResponse)
def get_night_verdict_stored(
    night_key: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session_service: Annotated[SessionService, Depends(get_session_service)],
):
    """
    Return stored verdict for a night (backend source of truth). Used by night detail screen.
    404 only when no session exists for this user+night. If session exists but verdict not yet
    stored, returns 200 with verdict="unclear" and a short reason so the app does not treat it as an error.
    """
    row = session_service.get_session_by_night_key(user_id, night_key)
    if not row:
        raise HTTPException(status_code=404, detail="No session found for this night")
    if not row.get("verdict"):
        return NightVerdictResponse(
            verdict="unclear",
            reason="Verdict not yet available for this night.",
            suggest_next=None,
            suggest_next_reason=None,
        )
    return NightVerdictResponse(
        verdict=row["verdict"],
        reason=row.get("verdict_reason") or "",
        suggest_next=row.get("suggest_next"),
        suggest_next_reason=row.get("suggest_next_reason"),
    )
