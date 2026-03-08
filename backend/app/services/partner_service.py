"""Partner service: codes, invite, check-in tokens."""

import secrets
from datetime import datetime, timedelta

from app.config import settings


class PartnerService:
    def __init__(self, supabase):
        self._supabase = supabase

    def generate_code(self, user_id: str) -> dict:
        code = f"{secrets.randbelow(900000) + 100000}"
        self._supabase.table("invite_codes").upsert({
            "code": code,
            "sleeper_id": user_id,
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z",
        }, on_conflict="code").execute()
        return {"code": code}

    def link_by_code(self, user_id: str, code: str) -> dict:
        r = self._supabase.table("invite_codes").select("*").eq("code", code.strip()).execute()
        if not r.data or len(r.data) == 0:
            raise ValueError("Invalid or expired code")
        row = r.data[0]
        sleeper_id = row["sleeper_id"]
        self._supabase.table("invite_codes").delete().eq("code", code).execute()
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
        self._supabase.table("partner_invites").insert({
            "sleeper_id": user_id,
            "email": email.strip().lower(),
            "token": token,
        }).execute()
        return {"status": "sent", "message": "Invite will be sent when email is configured"}

    def create_checkin_token(self, user_id: str, session_id: str) -> dict:
        token = secrets.token_urlsafe(24)
        expires = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
        self._supabase.table("partner_checkin_tokens").insert({
            "token": token,
            "session_id": session_id,
            "expires_at": expires,
        }).execute()
        url = f"{settings.partner_checkin_base_url}?t={token}"
        return {"url": url}

    def get_checkin_info(self, token: str) -> dict:
        r = self._supabase.table("partner_checkin_tokens").select("session_id, expires_at").eq("token", token).execute()
        if not r.data or len(r.data) == 0:
            return {"valid": False, "message": "Invalid or expired link"}
        row = r.data[0]
        if row.get("expires_at"):
            from datetime import timezone
            exp = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                return {"valid": False, "message": "Link expired"}
        sess = self._supabase.table("sleep_sessions").select("id, night_key, created_at").eq("id", row["session_id"]).execute()
        if not sess.data:
            return {"valid": False, "message": "Session not found"}
        return {"valid": True, "session_id": row["session_id"], "night_key": sess.data[0].get("night_key"), "date": sess.data[0].get("created_at")}

    def submit_checkin(self, token: str, report: str) -> dict:
        r = self._supabase.table("partner_checkin_tokens").select("session_id").eq("token", token).execute()
        if not r.data or len(r.data) == 0:
            return {"success": False, "message": "Invalid or expired link"}
        session_id = r.data[0]["session_id"]
        self._supabase.table("partner_checkin_tokens").delete().eq("token", token).execute()
        self._supabase.table("sleep_sessions").update({"partner_report": report}).eq("id", session_id).execute()
        return {"success": True}
