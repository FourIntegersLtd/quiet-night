"""Application settings from environment."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env from app/ (backend/app/.env)
_env_path = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_path),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""  # Required for auth.admin (e.g. get_user_by_id)

    # App
    app_env: str = "development"
    partner_checkin_base_url: str = "https://quietnight.app/partner/checkin"

    # OpenAI (optional — used for journey summaries, insights)
    # Set OPENAI_API_KEY in .env (backend/app/.env)
    openai_api_key: str = ""


settings = Settings()
