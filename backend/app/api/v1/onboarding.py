"""Public onboarding submit (no auth). Saves onboarding for user research whether or not user creates an account."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_auth_service
from app.models.schemas import OnboardingSubmitRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("")
def submit_onboarding(
    body: OnboardingSubmitRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> dict:
    """Save onboarding answers. No auth required. Call when user reaches paywall (before or without account)."""
    service.save_onboarding_anonymous(body.anonymous_id, body.onboarding_responses)
    return {"ok": True}
