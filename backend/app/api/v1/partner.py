"""Partner routes: code generate/link, invite, checkin."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_id, get_partner_service
from app.models.schemas import (
    CodeLinkRequest,
    InviteRequest,
    CheckinRequestRequest,
    CheckinSubmitRequest,
)
from app.services.partner_service import PartnerService

router = APIRouter()


@router.post("/code/generate")
def generate_code(
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[PartnerService, Depends(get_partner_service)],
):
    return service.generate_code(user_id)


@router.post("/code/link")
def link_by_code(
    body: CodeLinkRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[PartnerService, Depends(get_partner_service)],
):
    try:
        return service.link_by_code(user_id, body.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invite")
def send_invite(
    body: InviteRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[PartnerService, Depends(get_partner_service)],
):
    return service.send_invite(user_id, body.email)


@router.post("/checkin/request")
def checkin_request(
    body: CheckinRequestRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[PartnerService, Depends(get_partner_service)],
):
    return service.create_checkin_token(user_id, body.session_id)


@router.get("/checkin")
def checkin_form(
    token: str,
    service: Annotated[PartnerService, Depends(get_partner_service)],
):
    return service.get_checkin_info(token)


@router.post("/checkin")
def checkin_submit(
    body: CheckinSubmitRequest,
    service: Annotated[PartnerService, Depends(get_partner_service)],
):
    return service.submit_checkin(body.token, body.report, body.note)
