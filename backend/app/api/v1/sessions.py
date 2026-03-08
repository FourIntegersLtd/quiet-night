"""Session routes: CRUD, snores, factors."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_id, get_supabase_client
from app.models.schemas import (
    SessionStartRequest,
    SessionEndRequest,
    SnoresAppendRequest,
    FactorsUpdateRequest,
)
from app.services.session_service import SessionService

router = APIRouter()


def get_session_service(supabase=Depends(get_supabase_client)):
    return SessionService(supabase)


@router.get("")
def list_sessions(
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[SessionService, Depends(get_session_service)],
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
):
    return service.list_sessions(user_id, date_from=date_from, date_to=date_to, limit=limit)


@router.get("/{session_id}")
def get_session(
    session_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[SessionService, Depends(get_session_service)],
):
    out = service.get_session(user_id, session_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return out


@router.post("")
def create_session(
    body: SessionStartRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[SessionService, Depends(get_session_service)],
):
    return service.create_session(
        user_id,
        remedy_type=body.remedy_type,
        is_shared_room_night=body.is_shared_room_night,
        factors=body.factors,
    )


@router.patch("/{session_id}")
def end_session(
    session_id: str,
    body: SessionEndRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[SessionService, Depends(get_session_service)],
):
    try:
        return service.end_session(
            user_id,
            session_id,
            end_time=body.end_time,
            total_duration_minutes=body.total_duration_minutes,
            snore_percentage=body.snore_percentage,
            loud_snore_minutes=body.loud_snore_minutes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{session_id}/snores")
def append_snores(
    session_id: str,
    body: SnoresAppendRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[SessionService, Depends(get_session_service)],
):
    try:
        return service.append_snores(user_id, session_id, body.events)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{session_id}/factors")
def update_factors(
    session_id: str,
    body: FactorsUpdateRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[SessionService, Depends(get_session_service)],
):
    factors = body.model_dump(exclude_none=True)
    if not factors:
        return {"id": session_id}
    try:
        return service.set_factors(user_id, session_id, factors)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
