"""
Central OpenAI client. Uses OPENAI_API_KEY from config.
Use parse_chat() for structured outputs (Pydantic); returns None if no key or parse fails.
"""

import logging
from typing import TypeVar

from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_openai_client = None


def get_client():
    """Return OpenAI client if OPENAI_API_KEY is set, else None."""
    global _openai_client
    api_key = getattr(settings, "openai_api_key", "") or ""
    if not api_key:
        return None
    try:
        import openai
    except ImportError as e:
        print(f"[llm] openai import failed: {e}")
        return None
    try:
        if _openai_client is None:
            _openai_client = openai.OpenAI(api_key=api_key)
            print("[llm] OpenAI client created OK")
        return _openai_client
    except Exception as e:
        print(f"[llm] OpenAI client init failed: {e}")
        return None


def parse_chat(
    system_prompt: str,
    user_prompt: str,
    response_format: type[T],
    *,
    model: str = "gpt-4o-mini",
    temperature: float = 0.5,
    max_tokens: int = 800,
) -> T | None:
    """
    Call chat.completions.parse with system + user prompt and Pydantic response format.
    Returns parsed instance or None if no client, no key, or empty/invalid response.
    """
    client = get_client()
    if not client:
        logger.info("[llm] No OpenAI API key or client – using fallback")
        print("[llm] No OpenAI API key or client – using fallback")
        return None
    try:
        response = client.chat.completions.parse(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=response_format,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        parsed = response.choices[0].message.parsed if response.choices else None
        if not parsed:
            logger.warning("[llm] LLM returned empty parsed result – using fallback")
            print("[llm] LLM returned empty parsed result – using fallback")
            return None
        return parsed
    except Exception as e:
        logger.warning("[llm] LLM call failed: %s – using fallback", e)
        print(f"[llm] LLM call failed: {e} – using fallback")
        return None
