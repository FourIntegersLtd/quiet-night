"""Auth routes: GET /me, PATCH /me."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import verify_token, get_auth_service
from app.models.schemas import MeResponse, ProfileUpdate
from app.services.auth_service import AuthService
from app.services.supabase_auth_service import get_user_by_id, update_user_metadata

router = APIRouter(prefix="/me", tags=["auth"])


def _me_response_from_auth_fallback(
    user_id: str,
    *,
    role: str = "SLEEPER",
    first_name: str | None = None,
    onboarding_done: bool = False,
) -> MeResponse:
    """Build MeResponse from auth user when profile row is missing or incomplete."""
    result = get_user_by_id(user_id)
    email = None
    fallback_first = first_name
    if result.get("success") and result.get("user"):
        u = result["user"]
        email = u.get("email")
        if u.get("user_metadata"):
            fallback_first = fallback_first or u["user_metadata"].get("full_name") or u["user_metadata"].get("first_name")
    return MeResponse(
        id=user_id,
        email=email,
        role=role,
        first_name=fallback_first,
        onboarding_done=onboarding_done,
        connection=None,
        preferred_name=None,
        partner_name=None,
    )


@router.get("", response_model=MeResponse)
def get_me(
    user_id: Annotated[str, Depends(verify_token)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    profile = service.get_profile(user_id)
    if profile is None:
        return _me_response_from_auth_fallback(user_id)
    if profile.email is None or profile.email == "":
        auth_result = get_user_by_id(user_id)
        if auth_result.get("success") and auth_result.get("user") and auth_result["user"].get("email"):
            return MeResponse(
                id=profile.id,
                email=auth_result["user"]["email"],
                role=profile.role,
                first_name=profile.first_name or (auth_result["user"].get("user_metadata") or {}).get("full_name"),
                onboarding_done=profile.onboarding_done,
                connection=profile.connection,
                preferred_name=profile.preferred_name,
                partner_name=profile.partner_name,
            )
    return profile


@router.patch("", response_model=MeResponse)
def update_me(
    body: ProfileUpdate,
    user_id: Annotated[str, Depends(verify_token)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    patch = body.model_dump(exclude_unset=True)
    profile_patch = {k: patch[k] for k in patch if k in {"first_name", "role", "onboarding_done", "weight_kg", "height_cm"}}
    if profile_patch:
        service.update_profile(user_id, **profile_patch)
    if body.onboarding_responses is not None:
        service.save_onboarding(user_id, body.onboarding_responses, anonymous_id=body.anonymous_id)
    meta: dict = {}
    if body.has_partner is not None:
        meta["has_partner"] = body.has_partner
    if body.onboarding_responses is not None:
        meta["onboarding_responses"] = body.onboarding_responses
    if meta:
        update_user_metadata(user_id, meta, merge=True)
    profile = service.get_profile(user_id)
    if profile is None:
        return _me_response_from_auth_fallback(
            user_id,
            role=body.role or "SLEEPER",
            first_name=body.first_name,
            onboarding_done=body.onboarding_done or False,
        )
    return profile
