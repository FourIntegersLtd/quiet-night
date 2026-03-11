"""Session service: CRUD, snores, factors."""

from datetime import datetime
from typing import Any

from app.cache import invalidate_llm_caches
from app.models.schemas import SnoreEventInput


class SessionService:
    def __init__(self, supabase):
        self._supabase = supabase

    @staticmethod
    def _merge_sessions_for_night(sessions: list[dict]) -> dict:
        """Merge multiple sessions for the same night into one: earliest start, latest end, summed duration and loud_snore_minutes. Primary session (for id, verdict, remedy) = latest end_time, else latest start_time, else latest created_at."""
        if not sessions:
            return {}
        if len(sessions) == 1:
            return dict(sessions[0])

        def _sort_key(s: dict) -> tuple:
            end = (s.get("end_time") or "") or "0000"
            start = (s.get("start_time") or "") or "0000"
            created = (s.get("created_at") or "") or "0000"
            return (end, start, created)

        primary = max(sessions, key=_sort_key)
        merged = dict(primary)
        start_times = [s.get("start_time") for s in sessions if s.get("start_time")]
        end_times = [s.get("end_time") for s in sessions if s.get("end_time")]
        merged["start_time"] = min(start_times) if start_times else primary.get("start_time")
        merged["end_time"] = max(end_times) if end_times else primary.get("end_time")
        total_mins = sum(
            (s.get("total_duration_minutes") if s.get("total_duration_minutes") is not None else 0)
            for s in sessions
        )
        merged["total_duration_minutes"] = total_mins if total_mins else primary.get("total_duration_minutes")
        loud_mins = sum(
            (s.get("loud_snore_minutes") if s.get("loud_snore_minutes") is not None else 0)
            for s in sessions
        )
        merged["loud_snore_minutes"] = round(loud_mins, 1) if (loud_mins or primary.get("loud_snore_minutes") is not None) else primary.get("loud_snore_minutes")
        if total_mins and loud_mins is not None:
            merged["snore_percentage"] = round((loud_mins / total_mins) * 100, 1)
        else:
            merged["snore_percentage"] = primary.get("snore_percentage")
        return merged

    def list_sessions(
        self,
        user_id: str,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        q = (
            self._supabase.table("sleep_sessions")
            .select(
                "id, night_key, start_time, end_time, total_duration_minutes, snore_percentage, "
                "loud_snore_minutes, remedy_type, partner_report, partner_note, "
                "verdict, verdict_reason, suggest_next, suggest_next_reason, created_at"
            )
            .eq("sleeper_id", user_id)
            .order("created_at", desc=True)
            .limit(limit * 3)
            # fetch extra so we have enough after grouping by night
        )
        if date_from:
            q = q.gte("night_key", date_from)
        if date_to:
            q = q.lte("night_key", date_to)
        r = q.execute()
        raw = r.data or []
        by_night: dict[str, list[dict]] = {}
        for row in raw:
            nk = row.get("night_key") or ""
            by_night.setdefault(nk, []).append(row)
        merged_list = [self._merge_sessions_for_night(rows) for rows in by_night.values()]
        merged_list.sort(key=lambda x: (x.get("night_key") or "", x.get("created_at") or ""), reverse=True)
        return merged_list[:limit]

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
        night_key: str | None = None,
        remedy_type: str | None = None,
        is_shared_room_night: bool | None = None,
        factors: dict[str, Any] | None = None,
    ) -> dict:
        now = datetime.utcnow()
        if not night_key or not night_key.strip():
            night_key = now.strftime("%Y-%m-%d")
        else:
            # Normalize "night_2026-03-09" -> "2026-03-09"
            night_key = night_key.replace("night_", "").strip()
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
        invalidate_llm_caches()
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
        rows = []
        for e in events:
            row = {
                "session_id": session_id,
                "timestamp": e.timestamp,
                "confidence": e.confidence,
                "audio_uri": e.audio_uri,
            }
            if e.duration_seconds is not None:
                row["duration_seconds"] = e.duration_seconds
            rows.append(row)
        if rows:
            self._supabase.table("snore_events").insert(rows).execute()
        invalidate_llm_caches()
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

    @staticmethod
    def _normalize_night_key(night_key: str) -> str:
        return night_key.strip().replace("night_", "")

    def get_session_by_night_key(self, user_id: str, night_key: str) -> dict | None:
        """Return one merged session row for this sleeper and night (multiple segments consolidated)."""
        nk = self._normalize_night_key(night_key)
        r = (
            self._supabase.table("sleep_sessions")
            .select("*")
            .eq("sleeper_id", user_id)
            .eq("night_key", nk)
            .execute()
        )
        if not r.data or len(r.data) == 0:
            return None
        return self._merge_sessions_for_night(r.data)

    def update_session_verdict(
        self,
        user_id: str,
        night_key: str,
        verdict: str,
        verdict_reason: str,
        suggest_next: str | None = None,
        suggest_next_reason: str | None = None,
    ) -> bool:
        """Store verdict on the primary session row for this night (backend source of truth). Returns True if updated."""
        nk = self._normalize_night_key(night_key)
        r = (
            self._supabase.table("sleep_sessions")
            .select("id, end_time, start_time, created_at")
            .eq("sleeper_id", user_id)
            .eq("night_key", nk)
            .execute()
        )
        if not r.data:
            return False
        sessions = r.data
        primary = max(
            sessions,
            key=lambda s: (
                (s.get("end_time") or "") or "0000",
                (s.get("start_time") or "") or "0000",
                (s.get("created_at") or "") or "0000",
            ),
        )
        payload = {
            "verdict": verdict,
            "verdict_reason": verdict_reason,
            "suggest_next": suggest_next,
            "suggest_next_reason": suggest_next_reason,
        }
        self._supabase.table("sleep_sessions").update(payload).eq("id", primary["id"]).execute()
        invalidate_llm_caches()
        return True
