"""Auth routes: GET /me, PATCH /me."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import verify_token, get_supabase_admin_client
from app.models.schemas import MeResponse, ProfileUpdate
from app.services.auth_service import AuthService
from app.services.supabase_auth_service import get_user_by_id, update_user_metadata

router = APIRouter(prefix="/me", tags=["auth"])


def get_auth_service(supabase=Depends(get_supabase_admin_client)):
    """Use admin client so profile get/update bypass RLS (backend already verified user)."""
    return AuthService(supabase)


def _auth_user_fallback(user_id: str) -> dict:
    """Enrich with auth user (email, etc.) when profile is missing or has no email."""
    result = get_user_by_id(user_id)
    if not result.get("success") or not result.get("user"):
        return {}
    u = result["user"]
    out = {"email": u.get("email")}
    if u.get("user_metadata"):
        out.setdefault("first_name", u["user_metadata"].get("full_name") or u["user_metadata"].get("first_name"))
    return out


@router.get("", response_model=MeResponse)
def get_me(
    user_id: Annotated[str, Depends(verify_token)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    profile = service.get_profile(user_id)
    if profile is None:
        auth = _auth_user_fallback(user_id)
        return MeResponse(
            id=user_id,
            email=auth.get("email"),
            role="SLEEPER",
            first_name=auth.get("first_name"),
            onboarding_done=False,
            connection=None,
        )
    if profile.email is None or profile.email == "":
        auth = _auth_user_fallback(user_id)
        if auth.get("email") is not None:
            return MeResponse(
                id=profile.id,
                email=auth.get("email"),
                role=profile.role,
                first_name=profile.first_name or auth.get("first_name"),
                onboarding_done=profile.onboarding_done,
                connection=profile.connection,
            )
    return profile


@router.patch("", response_model=MeResponse)
def update_me(
    body: ProfileUpdate,
    user_id: Annotated[str, Depends(verify_token)],
    service: Annotated[AuthService, Depends(get_auth_service)],
):
    # Update profiles table (first_name, role, onboarding_done); upserts so new users get a row
    service.update_profile(
        user_id,
        first_name=body.first_name,
        role=body.role,
        onboarding_done=body.onboarding_done,
    )
    # Store has_partner and onboarding_responses in Supabase auth user_metadata via admin API
    meta: dict = {}
    if body.has_partner is not None:
        meta["has_partner"] = body.has_partner
    if body.onboarding_responses is not None:
        meta["onboarding_responses"] = body.onboarding_responses
    if meta:
        update_user_metadata(user_id, meta, merge=True)
    profile = service.get_profile(user_id)
    if profile is None:
        auth = _auth_user_fallback(user_id)
        return MeResponse(
            id=user_id,
            email=auth.get("email"),
            role=body.role or "SLEEPER",
            first_name=body.first_name or auth.get("first_name"),
            onboarding_done=body.onboarding_done or False,
            connection=None,
        )
    return profile
