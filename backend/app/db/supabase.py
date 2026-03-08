"""Supabase client singleton."""

from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from app.config import settings


@lru_cache
def get_supabase() -> Client:
    """Return Supabase client with anon key (cached)."""
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("Supabase URL and anon key must be set")
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )


@lru_cache
def get_supabase_admin() -> Optional[Client]:
    """Return Supabase admin client (service role) if configured; else None."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
