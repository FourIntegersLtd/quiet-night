"""Experiment routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_id, get_experiment_service
from app.models.schemas import ExperimentCreateRequest, ExperimentUpdateRequest
from app.services.experiment_service import ExperimentService

router = APIRouter()


@router.get("")
def list_experiments(
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[ExperimentService, Depends(get_experiment_service)],
):
    return service.list_experiments(user_id)


@router.post("")
def create_experiment(
    body: ExperimentCreateRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[ExperimentService, Depends(get_experiment_service)],
):
    return service.create_experiment(user_id, body.remedy_type)


@router.patch("/{experiment_id}")
def update_experiment(
    experiment_id: str,
    body: ExperimentUpdateRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[ExperimentService, Depends(get_experiment_service)],
):
    try:
        return service.update_experiment(user_id, experiment_id, body.status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
