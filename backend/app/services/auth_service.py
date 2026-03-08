"""Auth service: profile get/update."""

from app.models.schemas import MeResponse, ConnectionSummary


class AuthService:
    def __init__(self, supabase):
        self._supabase = supabase

    def get_profile(self, user_id: str) -> MeResponse | None:
        """Load profile and optional connection for user."""
        try:
            r = self._supabase.table("profiles").select("*").eq("id", user_id).execute()
            if not r.data or len(r.data) == 0:
                return None
            row = r.data[0]
            connection = None
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
                connection = ConnectionSummary(
                    id=c["id"],
                    sleeper_id=c["sleeper_id"],
                    partner_id=c["partner_id"],
                    status=c["status"],
                    linked_at=c.get("linked_at"),
                )
            return MeResponse(
                id=row["id"],
                email=row.get("email"),
                role=row.get("role", "SLEEPER"),
                first_name=row.get("first_name"),
                onboarding_done=row.get("onboarding_done", False),
                connection=connection,
            )
        except Exception:
            return None

    def update_profile(
        self,
        user_id: str,
        first_name: str | None,
        role: str | None,
        onboarding_done: bool | None,
    ) -> None:
        """Update profile fields."""
        payload = {}
        if first_name is not None:
            payload["first_name"] = first_name
        if role is not None:
            payload["role"] = role
        if onboarding_done is not None:
            payload["onboarding_done"] = onboarding_done
        if not payload:
            return
        self._supabase.table("profiles").upsert(
            {"id": user_id, **payload},
            on_conflict="id",
        ).execute()
