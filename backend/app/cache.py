"""
Simple in-memory TTL cache for LLM responses.
24-hour default TTL to avoid redundant API calls.
"""

import hashlib
import json
import time
from typing import Any, Callable, TypeVar

T = TypeVar("T")
TTL_SECONDS = 24 * 60 * 60  # 24 hours

_cache: dict[str, tuple[Any, float]] = {}


def _make_key(prefix: str, *args: Any, **kwargs: Any) -> str:
    """Build a stable cache key from args and kwargs."""
    payload = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    h = hashlib.sha256(payload.encode()).hexdigest()
    return f"{prefix}:{h}"


def invalidate_prefix(prefix: str) -> None:
    """Remove all cache entries whose key starts with prefix:. Call when new recording data is saved so LLM responses stay up to date."""
    to_del = [k for k in _cache if k.startswith(f"{prefix}:")]
    for k in to_del:
        del _cache[k]


def invalidate_llm_caches() -> None:
    """Invalidate all LLM-related caches (night insight, personalized tip, best remedy summary). Call after end_session or append_snores."""
    invalidate_prefix("night_insight")
    invalidate_prefix("personalized_tip")
    invalidate_prefix("best_remedy_summary")


def cached(prefix: str, ttl_seconds: int = TTL_SECONDS):
    """Decorator: cache function result for ttl_seconds (default 24h)."""

    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        def wrapper(*args: Any, **kwargs: Any) -> T:
            key = _make_key(prefix, *args, **kwargs)
            now = time.time()
            if key in _cache:
                val, exp = _cache[key]
                if now < exp:
                    return val
                del _cache[key]
            result = fn(*args, **kwargs)
            _cache[key] = (result, now + ttl_seconds)
            return result

        return wrapper  # type: ignore

    return decorator
