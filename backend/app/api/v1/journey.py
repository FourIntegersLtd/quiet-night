"""Journey summaries: best remedy (LLM or fallback)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id, get_auth_service
from app.services.auth_service import AuthService
from app.models.schemas import (
    JourneyBestRemedyRequest,
    JourneyBestRemedyResponse,
)
from app.services.journey_summary_service import get_best_remedy_summary

router = APIRouter(prefix="/journey", tags=["journey"])


@router.post("/best-remedy-summary", response_model=JourneyBestRemedyResponse)
def post_best_remedy_summary(
    body: JourneyBestRemedyRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    """
    Get a short "Your best remedy" summary for the Journey screen.
    Send leaderboard from the app; returns LLM-generated or fallback. Uses user's name for personalisation.
    """
    leaderboard = [r.model_dump() for r in body.leaderboard]
    user_name = auth_service.get_display_name(user_id)
    result = get_best_remedy_summary(leaderboard, user_name=user_name)
    return JourneyBestRemedyResponse(**result)
