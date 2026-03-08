"""Pydantic request/response schemas. Align with mobile types where possible."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ----- Auth (credentials: signup, signin, signout, refresh) -----
class SignUpRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    full_name: str | None = None


class SignInRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class SessionData(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int | None = None  # Unix timestamp (seconds); mobile may use ms


class UserInfo(BaseModel):
    id: str
    email: str | None = None
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)


class SignUpResponse(BaseModel):
    success: bool
    session: SessionData | None = None
    user: UserInfo | None = None
    message: str | None = None  # e.g. email confirmation required
    error: str | None = None


class SignInResponse(BaseModel):
    success: bool
    session: SessionData | None = None
    user: UserInfo | None = None
    error: str | None = None


class SignOutResponse(BaseModel):
    success: bool
    error: str | None = None


class RefreshSessionRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class RefreshSessionResponse(BaseModel):
    success: bool
    session: SessionData | None = None
    user: UserInfo | None = None
    error: str | None = None


# ----- Auth / Me (profile) -----
class OnboardingResponses(BaseModel):
    """26-step onboarding answers; stored in user_metadata."""

    attribution_source: str | None = None
    prior_app_usage: str | None = None
    role: str | None = None  # SLEEPER | PARTNER | UNSURE
    sleeping_arrangement: str | None = None
    relationship_severity: int | None = None
    problem_duration: str | None = None
    remedies_tried: list[str] | None = None
    primary_goal: str | None = None
    target_weeks: int | None = None


class ProfileUpdate(BaseModel):
    first_name: str | None = None
    role: str | None = None  # SLEEPER | PARTNER | BOTH
    onboarding_done: bool | None = None
    has_partner: bool | None = None  # Stored in auth user_metadata after onboarding
    onboarding_responses: dict | None = None  # 26-step onboarding answers; stored in user_metadata


class ConnectionSummary(BaseModel):
    id: str
    sleeper_id: str
    partner_id: str
    status: str
    linked_at: str | None = None


class MeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str
    first_name: str | None = None
    onboarding_done: bool = False
    connection: ConnectionSummary | None = None


# ----- Partner -----
class CodeLinkRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class InviteRequest(BaseModel):
    email: str = Field(..., min_length=1)


class CheckinRequestRequest(BaseModel):
    session_id: str


class CheckinSubmitRequest(BaseModel):
    token: str
    report: str = Field(..., pattern="^(good|bad)$")


# ----- Sessions -----
class SessionStartRequest(BaseModel):
    remedy_type: str | None = None
    is_shared_room_night: bool | None = None
    factors: dict[str, Any] | None = None


class SessionEndRequest(BaseModel):
    end_time: str | None = None
    total_duration_minutes: int | None = None
    snore_percentage: float | None = None
    loud_snore_minutes: float | None = None


class SnoreEventInput(BaseModel):
    timestamp: int
    confidence: float = 0.0
    audio_uri: str | None = None


class SnoresAppendRequest(BaseModel):
    events: list[SnoreEventInput]


class FactorsUpdateRequest(BaseModel):
    alcohol_level: str | None = None
    congestion_level: str | None = None
    exhausted_today: bool | None = None
    worked_out: bool | None = None
    used_sedative: bool | None = None
    sick: bool | None = None
    smoking: bool | None = None
    caffeine: bool | None = None


# ----- Experiments -----
class ExperimentCreateRequest(BaseModel):
    remedy_type: str


class ExperimentUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(COMPLETED|ABANDONED|SET_AS_ROUTINE)$")


# ----- Epworth -----
class EpworthSubmitRequest(BaseModel):
    answers: list[int] = Field(..., min_length=8, max_length=8)


# ----- Journey (LLM summaries) -----
class LeaderboardRowInput(BaseModel):
    remedy: str
    nights: int
    reduction: int | None = None


class JourneyBestRemedyRequest(BaseModel):
    """Optional context for best-remedy summary (from app leaderboard)."""
    leaderboard: list[LeaderboardRowInput] = []


class JourneyBestRemedyResponse(BaseModel):
    title: str
    remedy_name: str
    summary: str
    recommendation: str


# ----- Insights (LLM night summary) -----
class NightInsightsRequest(BaseModel):
    snore_mins: int = 0
    peak_time: str = "—"
    remedy_name: str = "—"
    event_count: int = 0


class NightInsightsResponse(BaseModel):
    summary: str


# ----- Insights (personalized tip from last night) -----
class NightFactorsInput(BaseModel):
    """Pre-flight and morning factors from last night."""

    alcohol_level: str | None = None
    congestion_level: str | None = None
    exhausted_today: bool | None = None
    worked_out: bool | None = None
    used_sedative: bool | None = None
    sick: bool | None = None
    smoking: bool | None = None
    caffeine: bool | None = None
    note: str | None = None
    pre_sleep_other: list[str] | None = None
    sleep_quality: int | None = None
    snoring_severity: int | None = None
    disruptions: list[str] | None = None
    impact: list[str] | None = None


class PersonalizedTipRequest(BaseModel):
    """Request for a tip based on last night's sleep data."""

    night_key: str | None = None
    snore_mins: int = 0
    peak_time: str = "—"
    event_count: int = 0
    remedy: str | None = None
    factors: NightFactorsInput | None = None


class PersonalizedTipResponse(BaseModel):
    tip: str
