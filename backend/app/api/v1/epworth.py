"""Epworth routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id, get_supabase_client
from app.models.schemas import EpworthSubmitRequest
from app.services.epworth_service import EpworthService

router = APIRouter()


def get_epworth_service(supabase=Depends(get_supabase_client)):
    return EpworthService(supabase)


@router.post("")
def submit_assessment(
    body: EpworthSubmitRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[EpworthService, Depends(get_epworth_service)],
):
    return service.submit(user_id, body.answers)


@router.get("/latest")
def get_latest(
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[EpworthService, Depends(get_epworth_service)],
):
    out = service.get_latest(user_id)
    if out is None:
        return {}
    return out


@router.get("/gp-report")
def get_gp_report(
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[EpworthService, Depends(get_epworth_service)],
    assessment_id: str | None = None,
):
    return service.get_gp_report(user_id, assessment_id)
