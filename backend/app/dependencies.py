"""FastAPI dependencies: auth, db client."""

import json
import logging
from typing import Annotated
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.db.supabase import get_supabase

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


def verify_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> str:
    """Extract Bearer token, verify with Supabase Auth API, return user id. No JWT decode."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )
    token = credentials.credentials
    url = settings.supabase_url
    anon = settings.supabase_anon_key
    if not url or not anon:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured",
        )
    user_url = f"{url.rstrip('/')}/auth/v1/user"
    req = Request(
        user_url,
        method="GET",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": anon,
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(req, timeout=10) as resp:
            data = json.load(resp)
    except HTTPError as e:
        if e.code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        logger.warning("Supabase auth/user error: %s %s", e.code, e.read())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    except (URLError, OSError) as e:
        logger.warning("Supabase auth/user request failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        )
    user_id = data.get("id") if isinstance(data, dict) else None
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return str(user_id)


# Alias for backward compatibility
get_current_user_id = verify_token


def get_supabase_client():
    """Dependency that yields Supabase client (anon key)."""
    return get_supabase()


def get_supabase_admin_client():
    """Dependency that yields Supabase admin client (service role). Use for profile/DB ops to bypass RLS."""
    from app.db.supabase import get_supabase_admin
    admin = get_supabase_admin()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Add SUPABASE_SERVICE_ROLE_KEY to backend/app/.env (Supabase Dashboard → Settings → API → service_role secret)",
        )
    return admin
