"""Supabase Auth operations: sign-in, sign-up, sign-out, refresh session, get user by id."""

from typing import Any

from supabase import Client

from app.db.supabase import get_supabase_admin


def _user_info(user: Any) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "email": getattr(user, "email", None),
        "user_metadata": getattr(user, "user_metadata") or {},
        "app_metadata": getattr(user, "app_metadata") or {},
    }


def _session_data(session: Any) -> dict[str, Any] | None:
    if not session:
        return None
    data: dict[str, Any] = {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
    }
    if hasattr(session, "expires_at") and session.expires_at is not None:
        data["expires_at"] = session.expires_at
    return data


class SupabaseAuthService:
    """Handles Supabase Auth (sign-in, sign-up, sign-out, refresh)."""

    def __init__(self, supabase: Client):
        self._client = supabase

    def sign_in_with_password(self, email: str, password: str) -> dict[str, Any]:
        """Sign in with email and password. Returns session + user or error."""
        try:
            response = self._client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
            session = response.session
            user = response.user
            if not session or not user:
                return {"success": False, "error": "No session returned"}
            return {
                "success": True,
                "session": _session_data(session),
                "user": _user_info(user),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def sign_up(
        self,
        email: str,
        password: str,
        user_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Sign up a new user. May return session or message for email confirmation."""
        try:
            options = {}
            if user_metadata:
                options["data"] = user_metadata
            response = self._client.auth.sign_up(
                {"email": email, "password": password, "options": options}
            )
            user = response.user
            session = response.session
            if not user:
                return {"success": False, "error": "No user returned"}
            if session:
                return {
                    "success": True,
                    "session": _session_data(session),
                    "user": _user_info(user),
                }
            return {
                "success": True,
                "session": None,
                "user": _user_info(user),
                "message": "Account created. Please check your email for confirmation.",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def sign_out(self) -> dict[str, Any]:
        """Sign out. Client must clear stored tokens; server may have no session."""
        try:
            if hasattr(self._client.auth, "sign_out"):
                self._client.auth.sign_out()
        except Exception:
            pass  # Server often has no session; client clearing tokens is what matters
        return {"success": True}

    def refresh_session(self, refresh_token: str) -> dict[str, Any]:
        """Exchange refresh token for new access token and refresh token."""
        try:
            response = self._client.auth.refresh_session(refresh_token)
            session = response.session
            user = response.user
            if not session or not user:
                return {"success": False, "error": "No session returned"}
            return {
                "success": True,
                "session": _session_data(session),
                "user": _user_info(user),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


def get_user_by_id(user_id: str) -> dict[str, Any]:
    """
    Get auth user by ID using Supabase admin client.
    Requires SUPABASE_SERVICE_ROLE_KEY to be set.
    """
    admin = get_supabase_admin()
    if not admin:
        return {"success": False, "error": "Admin client not configured"}
    try:
        response = admin.auth.admin.get_user_by_id(user_id)
        user = response.user
        return {
            "success": True,
            "user": {
                "id": str(user.id),
                "email": getattr(user, "email", None),
                "user_metadata": getattr(user, "user_metadata") or {},
                "created_at": getattr(user, "created_at", None),
                "last_sign_in_at": getattr(user, "last_sign_in_at", None),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def update_user_metadata(user_id: str, metadata: dict[str, Any], merge: bool = False) -> dict[str, Any]:
    """
    Update auth user metadata using Supabase admin client.
    Requires SUPABASE_SERVICE_ROLE_KEY. Use for e.g. has_partner, full_name.
    If merge=True, fetches current metadata and merges before updating.
    """
    admin = get_supabase_admin()
    if not admin:
        return {"success": False, "error": "Admin client not configured"}
    try:
        if merge:
            resp = get_user_by_id(user_id)
            if resp.get("success") and resp.get("user"):
                current = dict(resp["user"].get("user_metadata") or {})
                current.update(metadata)
                metadata = current
        admin.auth.admin.update_user_by_id(user_id, {"user_metadata": metadata})
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
