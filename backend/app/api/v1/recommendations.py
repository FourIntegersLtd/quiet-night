"""Recommendations: what to try next (authenticated)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id, get_session_service, get_auth_service
from app.models.schemas import RecommendationNextResponse, RecommendationAlternativeResponse
from app.services.recommendation_service import get_next_recommendation
from app.services.session_service import SessionService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/next", response_model=RecommendationNextResponse)
def get_next(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session_service: Annotated[SessionService, Depends(get_session_service)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
):
    """
    Get the next recommended remedy to try (and optional alternatives) with LLM-generated reason.
    Triggered when user ends a recording session; can also be used by Lab screen.
    """
    result = get_next_recommendation(user_id, session_service, auth_service)
    return RecommendationNextResponse(
        suggested_remedy=result.get("suggested_remedy"),
        reason=result["reason"],
        alternatives=[
            RecommendationAlternativeResponse(remedy=a["remedy"], reason=a["reason"])
            for a in result.get("alternatives", [])
        ],
    )
