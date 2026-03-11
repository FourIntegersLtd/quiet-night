"""Partner service: invite codes, email invites, check-in links (all in partner_links table)."""

import secrets
from datetime import datetime, timedelta, timezone

from app.config import settings


class PartnerService:
    def __init__(self, supabase):
        self._supabase = supabase

    def generate_code(self, user_id: str) -> dict:
        self._supabase.table("partner_links").delete().eq("sleeper_id", user_id).eq("kind", "invite_code").execute()
        code = f"{secrets.randbelow(900000) + 100000}"
        self._supabase.table("partner_links").insert({
            "kind": "invite_code",
            "value": code,
            "sleeper_id": user_id,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        }).execute()
        return {"code": code}

    def link_by_code(self, user_id: str, code: str) -> dict:
        r = self._supabase.table("partner_links").select("*").eq("kind", "invite_code").eq("value", code.strip()).execute()
        if not r.data or len(r.data) == 0:
            raise ValueError("Invalid or expired code")
        row = r.data[0]
        sleeper_id = row["sleeper_id"]
        if row.get("expires_at"):
            exp = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                raise ValueError("Invalid or expired code")
        self._supabase.table("partner_links").delete().eq("id", row["id"]).execute()
        conn_r = (
            self._supabase.table("couple_connections")
            .select("*")
            .or_(f"and(sleeper_id.eq.{sleeper_id},partner_id.eq.{user_id}),and(sleeper_id.eq.{user_id},partner_id.eq.{sleeper_id})")
            .execute()
        )
        if conn_r.data and len(conn_r.data) > 0:
            self._supabase.table("couple_connections").update({"status": "ACTIVE"}).eq("id", conn_r.data[0]["id"]).execute()
            return {"status": "linked", "connection_id": conn_r.data[0]["id"]}
        ins = self._supabase.table("couple_connections").insert({
            "sleeper_id": sleeper_id,
            "partner_id": user_id,
            "status": "ACTIVE",
            "current_arrangement": "SEPARATE_ROOMS",
        }).execute()
        return {"status": "linked", "connection_id": ins.data[0]["id"]}

    def send_invite(self, user_id: str, email: str) -> dict:
        token = secrets.token_urlsafe(32)
        self._supabase.table("partner_links").insert({
            "kind": "email_invite",
            "value": token,
            "sleeper_id": user_id,
            "email": email.strip().lower(),
        }).execute()
        return {"status": "sent", "message": "Invite will be sent when email is configured"}

    def create_checkin_token(self, user_id: str, session_id: str) -> dict:
        token = secrets.token_urlsafe(24)
        expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        self._supabase.table("partner_links").insert({
            "kind": "checkin",
            "value": token,
            "sleeper_id": user_id,
            "session_id": session_id,
            "expires_at": expires,
        }).execute()
        url = f"{settings.partner_checkin_base_url}?t={token}"
        return {"url": url}

    def get_checkin_info(self, token: str) -> dict:
        r = self._supabase.table("partner_links").select("session_id, expires_at").eq("kind", "checkin").eq("value", token).execute()
        if not r.data or len(r.data) == 0:
            return {"valid": False, "message": "Invalid or expired link"}
        row = r.data[0]
        if row.get("expires_at"):
            exp = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                return {"valid": False, "message": "Link expired"}
        sess = self._supabase.table("sleep_sessions").select("id, night_key, created_at").eq("id", row["session_id"]).execute()
        if not sess.data:
            return {"valid": False, "message": "Session not found"}
        return {"valid": True, "session_id": row["session_id"], "night_key": sess.data[0].get("night_key"), "date": sess.data[0].get("created_at")}

    def submit_checkin(self, token: str, report: str, note: str | None = None) -> dict:
        r = self._supabase.table("partner_links").select("id, session_id").eq("kind", "checkin").eq("value", token).execute()
        if not r.data or len(r.data) == 0:
            return {"success": False, "message": "Invalid or expired link"}
        row = r.data[0]
        session_id = row["session_id"]
        self._supabase.table("partner_links").delete().eq("id", row["id"]).execute()
        payload = {"partner_report": report}
        if note is not None and note.strip():
            payload["partner_note"] = note.strip()
        self._supabase.table("sleep_sessions").update(payload).eq("id", session_id).execute()
        return {"success": True}
