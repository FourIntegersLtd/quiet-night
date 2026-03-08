"""Journey summaries: best remedy (LLM or fallback)."""

from fastapi import APIRouter

from app.models.schemas import (
    JourneyBestRemedyRequest,
    JourneyBestRemedyResponse,
)
from app.services.journey_summary_service import get_best_remedy_summary

router = APIRouter(prefix="/journey", tags=["journey"])


@router.post("/best-remedy-summary", response_model=JourneyBestRemedyResponse)
def post_best_remedy_summary(body: JourneyBestRemedyRequest):
    """
    Get a short "Your best remedy" summary for the Journey screen.
    Send leaderboard from the app; returns LLM-generated or fallback summary.
    """
    leaderboard = [r.model_dump() for r in body.leaderboard]
    result = get_best_remedy_summary(leaderboard)
    return JourneyBestRemedyResponse(**result)
