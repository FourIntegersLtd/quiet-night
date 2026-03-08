"""Session service: CRUD, snores, factors."""

from datetime import datetime
from typing import Any

from app.models.schemas import SnoreEventInput


class SessionService:
    def __init__(self, supabase):
        self._supabase = supabase

    def list_sessions(
        self,
        user_id: str,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        q = (
            self._supabase.table("sleep_sessions")
            .select("id, night_key, remedy_type, loud_snore_minutes, partner_report, created_at")
            .eq("sleeper_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if date_from:
            q = q.gte("night_key", date_from)
        if date_to:
            q = q.lte("night_key", date_to)
        r = q.execute()
        return r.data or []

    def get_session(self, user_id: str, session_id: str) -> dict | None:
        r = (
            self._supabase.table("sleep_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("sleeper_id", user_id)
            .execute()
        )
        if not r.data or len(r.data) == 0:
            return None
        row = r.data[0]
        snores = (
            self._supabase.table("snore_events")
            .select("*")
            .eq("session_id", session_id)
            .order("timestamp")
            .execute()
        )
        row["snores"] = snores.data or []
        return row

    def create_session(
        self,
        user_id: str,
        remedy_type: str | None = None,
        is_shared_room_night: bool | None = None,
        factors: dict[str, Any] | None = None,
    ) -> dict:
        now = datetime.utcnow()
        night_key = now.strftime("%Y-%m-%d")
        payload = {
            "sleeper_id": user_id,
            "night_key": night_key,
            "start_time": now.isoformat() + "Z",
        }
        if remedy_type:
            payload["remedy_type"] = remedy_type
        if is_shared_room_night is not None:
            payload["is_shared_room_night"] = is_shared_room_night
        if factors:
            payload["factors"] = factors
        ins = self._supabase.table("sleep_sessions").insert(payload).execute()
        return {"id": ins.data[0]["id"], "night_key": night_key}

    def end_session(
        self,
        user_id: str,
        session_id: str,
        end_time: str | None = None,
        total_duration_minutes: int | None = None,
        snore_percentage: float | None = None,
        loud_snore_minutes: float | None = None,
    ) -> dict:
        r = (
            self._supabase.table("sleep_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("sleeper_id", user_id)
            .execute()
        )
        if not r.data:
            raise ValueError("Session not found")
        payload = {}
        if end_time is not None:
            payload["end_time"] = end_time
        if total_duration_minutes is not None:
            payload["total_duration_minutes"] = total_duration_minutes
        if snore_percentage is not None:
            payload["snore_percentage"] = snore_percentage
        if loud_snore_minutes is not None:
            payload["loud_snore_minutes"] = loud_snore_minutes
        if payload:
            self._supabase.table("sleep_sessions").update(payload).eq("id", session_id).execute()
        return {"id": session_id}

    def append_snores(self, user_id: str, session_id: str, events: list[SnoreEventInput]) -> dict:
        r = (
            self._supabase.table("sleep_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("sleeper_id", user_id)
            .execute()
        )
        if not r.data:
            raise ValueError("Session not found")
        rows = [
            {
                "session_id": session_id,
                "timestamp": e.timestamp,
                "confidence": e.confidence,
                "audio_uri": e.audio_uri,
            }
            for e in events
        ]
        if rows:
            self._supabase.table("snore_events").insert(rows).execute()
        return {"appended": len(rows)}

    def set_factors(self, user_id: str, session_id: str, factors: dict[str, Any]) -> dict:
        r = (
            self._supabase.table("sleep_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("sleeper_id", user_id)
            .execute()
        )
        if not r.data:
            raise ValueError("Session not found")
        self._supabase.table("sleep_sessions").update({"factors": factors}).eq("id", session_id).execute()
        return {"id": session_id}
