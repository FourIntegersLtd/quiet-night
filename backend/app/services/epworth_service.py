"""Epworth service: submit, latest, GP report."""

from datetime import datetime


class EpworthService:
    def __init__(self, supabase):
        self._supabase = supabase

    def submit(self, user_id: str, answers: list[int]) -> dict:
        total = sum(answers) if len(answers) >= 8 else 0
        ins = self._supabase.table("epworth_assessments").insert({
            "user_id": user_id,
            "total_score": total,
            "answers_json": answers,
            "completed_at": datetime.utcnow().isoformat() + "Z",
        }).execute()
        return {"id": ins.data[0]["id"], "total_score": total}

    def get_latest(self, user_id: str) -> dict | None:
        r = (
            self._supabase.table("epworth_assessments")
            .select("*")
            .eq("user_id", user_id)
            .order("completed_at", desc=True)
            .limit(1)
            .execute()
        )
        if not r.data:
            return None
        return r.data[0]

    def get_gp_report(self, user_id: str, assessment_id: str | None = None) -> dict:
        if assessment_id:
            r = self._supabase.table("epworth_assessments").select("*").eq("id", assessment_id).eq("user_id", user_id).execute()
        else:
            r = (
                self._supabase.table("epworth_assessments")
                .select("*")
                .eq("user_id", user_id)
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )
        if not r.data:
            return {"url": None, "message": "No assessment found"}
        return {"url": None, "message": "PDF generation will be available when configured", "assessment_id": r.data[0]["id"]}
