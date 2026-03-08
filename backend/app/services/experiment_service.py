"""Experiment service: list, create, update."""

from datetime import datetime, timedelta


class ExperimentService:
    def __init__(self, supabase):
        self._supabase = supabase

    def list_experiments(self, user_id: str) -> list[dict]:
        r = (
            self._supabase.table("experiments")
            .select("id, remedy_type, status, start_date, end_date, created_at")
            .eq("sleeper_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        data = r.data or []
        for row in data:
            nights_r = self._supabase.table("sleep_sessions").select("id").eq("experiment_id", row["id"]).execute()
            row["nights_count"] = len(nights_r.data) if nights_r.data else 0
        return data

    def create_experiment(self, user_id: str, remedy_type: str) -> dict:
        start = datetime.utcnow()
        end = start + timedelta(days=7)
        ins = self._supabase.table("experiments").insert({
            "sleeper_id": user_id,
            "remedy_type": remedy_type,
            "status": "IN_PROGRESS",
            "start_date": start.date().isoformat(),
            "end_date": end.date().isoformat(),
        }).execute()
        return {"id": ins.data[0]["id"]}

    def update_experiment(self, user_id: str, experiment_id: str, status: str) -> dict:
        r = self._supabase.table("experiments").select("id").eq("id", experiment_id).eq("sleeper_id", user_id).execute()
        if not r.data:
            raise ValueError("Experiment not found")
        self._supabase.table("experiments").update({"status": status}).eq("id", experiment_id).execute()
        return {"id": experiment_id, "status": status}
