"""Auth credential routes: signup, signin, signout, refresh. Uses Supabase Auth."""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_supabase_client
from app.models.schemas import (
    SignUpRequest,
    SignUpResponse,
    SignInRequest,
    SignInResponse,
    SignOutResponse,
    RefreshSessionRequest,
    RefreshSessionResponse,
)
from app.services.supabase_auth_service import SupabaseAuthService

router = APIRouter(prefix="/auth", tags=["auth-credentials"])


def get_supabase_auth_service(client=Depends(get_supabase_client)):
    return SupabaseAuthService(client)


@router.post("/signup", response_model=SignUpResponse)
async def sign_up(
    body: SignUpRequest,
    service: SupabaseAuthService = Depends(get_supabase_auth_service),
):
    """Sign up a new user with email and password."""
    metadata = {}
    if body.full_name:
        metadata["full_name"] = body.full_name
    result = service.sign_up(
        email=body.email,
        password=body.password,
        user_metadata=metadata or None,
    )
    if result.get("success"):
        return SignUpResponse(**result)
    raise HTTPException(status_code=400, detail=result.get("error", "Sign up failed"))


@router.post("/signin", response_model=SignInResponse)
async def sign_in(
    body: SignInRequest,
    service: SupabaseAuthService = Depends(get_supabase_auth_service),
):
    """Sign in with email and password."""
    result = service.sign_in_with_password(
        email=body.email,
        password=body.password,
    )
    if result.get("success"):
        return SignInResponse(**result)
    raise HTTPException(status_code=401, detail=result.get("error", "Invalid credentials"))


@router.post("/signout", response_model=SignOutResponse)
async def sign_out(
    service: SupabaseAuthService = Depends(get_supabase_auth_service),
):
    """Sign out. Client should clear stored tokens after calling this."""
    result = service.sign_out()
    if result.get("success"):
        return SignOutResponse(success=True)
    raise HTTPException(status_code=400, detail=result.get("error", "Sign out failed"))


@router.post("/refresh", response_model=RefreshSessionResponse)
async def refresh_session(
    body: RefreshSessionRequest,
    service: SupabaseAuthService = Depends(get_supabase_auth_service),
):
    """Exchange refresh token for new access and refresh tokens."""
    result = service.refresh_session(refresh_token=body.refresh_token)
    if result.get("success"):
        return RefreshSessionResponse(**result)
    raise HTTPException(status_code=401, detail=result.get("error", "Refresh failed"))
