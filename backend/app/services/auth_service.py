"""Auth service: profile get/update, onboarding, connection."""

from datetime import datetime, timezone

from app.models.schemas import MeResponse, ConnectionSummary


class AuthService:
    """Single place for profile, onboarding, and couple connection data."""

    def __init__(self, supabase):
        self._supabase = supabase

    def _get_onboarding_row(self, user_id: str) -> dict | None:
        """Load onboarding row for user. Returns first row or None."""
        try:
            ob = (
                self._supabase.table("onboarding")
                .select("onboarding_responses")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if ob.data and len(ob.data) > 0:
                return ob.data[0]
        except Exception:
            pass
        return None

    def get_onboarding_responses(self, user_id: str) -> dict | None:
        """Load onboarding_responses jsonb for user (e.g. remedies_tried). Returns None if not found."""
        row = self._get_onboarding_row(user_id)
        if row and isinstance(row.get("onboarding_responses"), dict):
            return row["onboarding_responses"]
        return None

    def _get_connection(self, user_id: str) -> ConnectionSummary | None:
        """Load active couple connection for user if any."""
        try:
            conn_r = (
                self._supabase.table("couple_connections")
                .select("*")
                .or_(f"sleeper_id.eq.{user_id},partner_id.eq.{user_id}")
                .eq("status", "ACTIVE")
                .limit(1)
                .execute()
            )
            if conn_r.data and len(conn_r.data) > 0:
                c = conn_r.data[0]
                return ConnectionSummary(
                    id=c["id"],
                    sleeper_id=c["sleeper_id"],
                    partner_id=c["partner_id"],
                    status=c["status"],
                    linked_at=c.get("linked_at"),
                )
        except Exception:
            pass
        return None

    def _get_onboarding_names(self, user_id: str) -> tuple[str | None, str | None]:
        """Return (preferred_name, partner_name) from onboarding_responses."""
        row = self._get_onboarding_row(user_id)
        if not row or not isinstance(row.get("onboarding_responses"), dict):
            return None, None
        resp = row["onboarding_responses"]
        preferred = resp.get("user_name") or resp.get("preferred_name")
        if isinstance(preferred, str):
            preferred = preferred.strip() or None
        partner = resp.get("partner_name")
        if isinstance(partner, str):
            partner = partner.strip() or None
        return preferred, partner

    def get_display_name(self, user_id: str) -> str | None:
        """Name to use when addressing the user in LLM copy: onboarding preferred name, or profile first_name, or None."""
        preferred, _ = self._get_onboarding_names(user_id)
        if preferred:
            return preferred
        try:
            r = self._supabase.table("profiles").select("first_name").eq("id", user_id).limit(1).execute()
            if r.data and len(r.data) > 0 and r.data[0].get("first_name"):
                return (r.data[0]["first_name"] or "").strip() or None
        except Exception:
            pass
        return None

    def get_profile(self, user_id: str) -> MeResponse | None:
        """Load profile with connection and onboarding names."""
        try:
            r = self._supabase.table("profiles").select("*").eq("id", user_id).execute()
            if not r.data or len(r.data) == 0:
                return None
            row = r.data[0]
            connection = self._get_connection(user_id)
            preferred_name, partner_name = self._get_onboarding_names(user_id)
            return MeResponse(
                id=row["id"],
                email=row.get("email"),
                role=row.get("role", "SLEEPER"),
                first_name=row.get("first_name"),
                onboarding_done=row.get("onboarding_done", False),
                weight_kg=row.get("weight_kg"),
                height_cm=row.get("height_cm"),
                connection=connection,
                preferred_name=preferred_name,
                partner_name=partner_name,
            )
        except Exception:
            return None

    _PROFILE_UPDATE_KEYS = frozenset({"first_name", "role", "onboarding_done", "weight_kg", "height_cm"})

    def update_profile(self, user_id: str, **kwargs: object) -> None:
        """Update profile fields. Only keys in kwargs are updated (None clears weight_kg/height_cm)."""
        payload = {k: v for k, v in kwargs.items() if k in self._PROFILE_UPDATE_KEYS}
        if not payload:
            return
        self._supabase.table("profiles").upsert(
            {"id": user_id, **payload},
            on_conflict="id",
        ).execute()

    def save_onboarding_anonymous(self, anonymous_id: str, onboarding_responses: dict) -> None:
        """Save onboarding for user who has not created an account yet (user research). No auth required."""
        now = datetime.now(timezone.utc).isoformat()
        self._supabase.table("onboarding").upsert(
            {
                "anonymous_id": anonymous_id,
                "onboarding_responses": onboarding_responses,
                "completed_at": now,
                "updated_at": now,
            },
            on_conflict="anonymous_id",
        ).execute()

    def save_onboarding(
        self, user_id: str, onboarding_responses: dict, anonymous_id: str | None = None
    ) -> None:
        """Save or link onboarding to user. If anonymous_id given, link that row to user_id; else upsert by user_id."""
        now = datetime.now(timezone.utc).isoformat()
        if anonymous_id:
            r = (
                self._supabase.table("onboarding")
                .update(
                    {
                        "user_id": user_id,
                        "onboarding_responses": onboarding_responses,
                        "updated_at": now,
                    }
                )
                .eq("anonymous_id", anonymous_id)
                .execute()
            )
            if r.data and len(r.data) > 0:
                return
        self._supabase.table("onboarding").upsert(
            {
                "user_id": user_id,
                "onboarding_responses": onboarding_responses,
                "completed_at": now,
                "updated_at": now,
            },
            on_conflict="user_id",
        ).execute()
