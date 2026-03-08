"""Insights: night summary (LLM) for morning screen, personalized tip for Tonight."""

from fastapi import APIRouter

from app.models.schemas import (
    NightInsightsRequest,
    NightInsightsResponse,
    PersonalizedTipRequest,
    PersonalizedTipResponse,
)
from app.services.insights_service import get_night_insight
from app.services.tip_service import get_personalized_tip

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("/night", response_model=NightInsightsResponse)
def post_night_insights(body: NightInsightsRequest):
    """
    Get a short LLM-generated "Night Insights" summary for the morning screen.
    Send last night's stats; returns summary or fallback.
    """
    summary = get_night_insight(
        snore_mins=body.snore_mins,
        peak_time=body.peak_time,
        remedy_name=body.remedy_name,
        event_count=body.event_count,
    )
    return NightInsightsResponse(summary=summary)


@router.post("/personalized-tip", response_model=PersonalizedTipResponse)
def post_personalized_tip(body: PersonalizedTipRequest):
    """
    Get a personalized tip for the Tonight screen based on last night's sleep.
    Send last night's factors, remedy, notes, and snoring stats; returns tip or fallback.
    """
    factors_dict = None
    note = None
    if body.factors:
        factors_dict = body.factors.model_dump(exclude_none=True)
        note = body.factors.note
    tip = get_personalized_tip(
        snore_mins=body.snore_mins,
        peak_time=body.peak_time,
        event_count=body.event_count,
        remedy=body.remedy,
        factors=factors_dict,
        note=note,
    )
    return PersonalizedTipResponse(tip=tip)
