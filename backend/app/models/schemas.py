"""Pydantic request/response schemas. Align with DB tables and mobile types."""

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
    """JWT session returned by sign-in/sign-up/refresh."""
    access_token: str
    refresh_token: str
    expires_at: int | None = None  # Unix timestamp (seconds); mobile may use ms


class UserInfo(BaseModel):
    """User info from Supabase Auth (id, email, metadata)."""
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
# profiles table: id, email, role, first_name, onboarding_done, weight_kg, height_cm, created_at, updated_at
# onboarding table: user_id or anonymous_id, onboarding_responses (jsonb), completed_at
class OnboardingResponses(BaseModel):
    """Subset of onboarding_responses jsonb (26-step wizard). Stored in onboarding table and auth user_metadata."""

    user_name: str | None = None  # Step 2: preferred name ("what they'd like to be called")
    has_partner: bool | None = None  # Step 4
    partner_name: str | None = None  # Step 5
    partner_email: str | None = None  # Step 5
    attribution_source: str | None = None
    prior_app_usage: str | None = None
    role: str | None = None  # SLEEPER | PARTNER | UNSURE
    sleeping_arrangement: str | None = None
    relationship_severity: int | None = None
    problem_duration: str | None = None
    remedies_tried: list[str] | None = None
    primary_goal: str | None = None
    target_weeks: int | None = None
    bedtime_reminder_time: str | None = None  # e.g. "21:00"
    weight_kg: float | None = None
    height_cm: float | None = None


class ProfileUpdate(BaseModel):
    """PATCH /api/me body. Updates profiles table and optionally onboarding table."""
    first_name: str | None = None
    role: str | None = None  # SLEEPER | PARTNER | BOTH
    onboarding_done: bool | None = None
    has_partner: bool | None = None  # Stored in auth user_metadata after onboarding
    onboarding_responses: dict | None = None  # Full jsonb; stored in onboarding table and user_metadata
    anonymous_id: str | None = None  # If set, link onboarding row to user_id when they complete signup
    weight_kg: float | None = None
    height_cm: float | None = None


class OnboardingSubmitRequest(BaseModel):
    """POST /api/onboarding body (no auth). Saves onboarding by anonymous_id for user research."""
    anonymous_id: str
    onboarding_responses: dict = Field(default_factory=dict)


class ConnectionSummary(BaseModel):
    """One row from couple_connections: sleeper_id, partner_id, status, linked_at."""
    id: str
    sleeper_id: str
    partner_id: str
    status: str
    linked_at: str | None = None
    current_arrangement: str | None = None  # DB column; e.g. SEPARATE_ROOMS


class MeResponse(BaseModel):
    """GET /api/me response. From profiles + onboarding (preferred_name, partner_name)."""
    id: str
    email: str | None = None
    role: str
    first_name: str | None = None
    onboarding_done: bool = False
    weight_kg: float | None = None
    height_cm: float | None = None
    connection: ConnectionSummary | None = None
    preferred_name: str | None = None  # From onboarding_responses.user_name
    partner_name: str | None = None  # From onboarding_responses.partner_name


# ----- Partner -----
# partner_links: consolidated table (kind = invite_code | checkin | email_invite), value, sleeper_id, session_id?, email?, expires_at?
class CodeLinkRequest(BaseModel):
    """Partner links with 6-digit code (partner_links.kind=invite_code)."""
    code: str = Field(..., min_length=6, max_length=6)


class InviteRequest(BaseModel):
    email: str = Field(..., min_length=1)


class CheckinRequestRequest(BaseModel):
    """Request a check-in link for a session (creates partner_links row with kind=checkin)."""
    session_id: str


class CheckinSubmitRequest(BaseModel):
    """Partner submits good/bad via check-in link (partner_links kind=checkin); optional note. Writes to sleep_sessions.partner_report and partner_note."""
    token: str
    report: str = Field(..., pattern="^(good|bad)$")
    note: str | None = None


# ----- Sessions -----
# sleep_sessions: id, sleeper_id, night_key, start_time, end_time, total_duration_minutes,
#   snore_percentage, loud_snore_minutes, partner_report, remedy_type, is_shared_room_night,
#   factors (jsonb), experiment_id, created_at
# snore_events: id, session_id, timestamp, confidence, audio_uri, duration_seconds
class SessionStartRequest(BaseModel):
    """POST /api/sessions body. Creates one sleep_sessions row."""
    night_key: str | None = None  # "night_YYYY-MM-DD" or "YYYY-MM-DD"; server normalizes to date
    remedy_type: str | None = None
    is_shared_room_night: bool | None = None
    factors: dict[str, Any] | None = None  # e.g. room_result, alcohol_level (stored in jsonb)


class SessionEndRequest(BaseModel):
    """PATCH /api/sessions/{id} body. Updates end_time and summary fields."""
    end_time: str | None = None
    total_duration_minutes: int | None = None
    snore_percentage: float | None = None
    loud_snore_minutes: float | None = None


class SnoreEventInput(BaseModel):
    """One snore clip in POST /api/sessions/{id}/snores. Inserted into snore_events."""
    timestamp: int  # Unix seconds (or ms; backend stores as bigint)
    confidence: float = 0.0
    audio_uri: str | None = None
    duration_seconds: float | None = None  # Clip length from native detector


class SnoresAppendRequest(BaseModel):
    events: list[SnoreEventInput]


class FactorsUpdateRequest(BaseModel):
    """PATCH /api/sessions/{id}/factors body. Merged into sleep_sessions.factors jsonb."""
    alcohol_level: str | None = None
    congestion_level: str | None = None
    room_result: str | None = None  # quiet | moderate | loud | error (baseline)
    exhausted_today: bool | None = None
    worked_out: bool | None = None
    used_sedative: bool | None = None
    sick: bool | None = None
    smoking: bool | None = None
    caffeine: bool | None = None


class SessionListItem(BaseModel):
    """One row from GET /api/sessions (list). Matches sleep_sessions select."""
    id: str
    night_key: str
    remedy_type: str | None = None
    loud_snore_minutes: float | None = None
    partner_report: str | None = None
    created_at: str | None = None


class SnoreEventRow(BaseModel):
    """One row from snore_events (returned inside GET /api/sessions/{id})."""
    id: str
    session_id: str
    timestamp: int
    confidence: float = 0.0
    audio_uri: str | None = None
    duration_seconds: float | None = None


class SessionDetail(BaseModel):
    """GET /api/sessions/{id} response: full session row + snores list."""
    id: str
    sleeper_id: str
    night_key: str
    start_time: str
    end_time: str | None = None
    total_duration_minutes: int | None = None
    snore_percentage: float | None = None
    loud_snore_minutes: float | None = None
    partner_report: str | None = None
    remedy_type: str | None = None
    is_shared_room_night: bool | None = None
    factors: dict[str, Any] | None = None
    experiment_id: str | None = None
    created_at: str
    snores: list[SnoreEventRow] = Field(default_factory=list)


# ----- Experiments -----
# experiments: id, sleeper_id, remedy_type, status, start_date, end_date, created_at
class ExperimentCreateRequest(BaseModel):
    remedy_type: str


class ExperimentUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(COMPLETED|ABANDONED|SET_AS_ROUTINE)$")


# ----- Epworth -----
# epworth_assessments: id, user_id, total_score, answers_json (jsonb), completed_at
class EpworthSubmitRequest(BaseModel):
    """POST /api/epworth body. 8 answers (0–3 each); total_score = sum."""
    answers: list[int] = Field(..., min_length=8, max_length=8)


class EpworthSubmitResponse(BaseModel):
    """POST /api/epworth response."""
    id: str
    total_score: int


class EpworthLatestResponse(BaseModel):
    """GET /api/epworth/latest response. Single most recent assessment."""
    id: str
    total_score: int
    answers_json: list[int]  # 8 integers
    completed_at: str


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
    """Pre-flight and morning factors; aligns with sleep_sessions.factors jsonb and wizard."""

    alcohol_level: str | None = None
    congestion_level: str | None = None
    room_result: str | None = None  # quiet | moderate | loud | error (baseline)
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
    """Request for tip based on last night (Tonight screen)."""

    night_key: str | None = None
    snore_mins: int = 0
    peak_time: str = "—"
    event_count: int = 0
    remedy: str | None = None
    factors: NightFactorsInput | None = None


class PersonalizedTipResponse(BaseModel):
    tip: str


# ----- Night verdict (experiment result + what to try next) -----
class NightVerdictRequest(BaseModel):
    """POST /api/insights/night-verdict: this night's data to compute verdict."""

    night_key: str = Field(..., description="e.g. night_2026-03-09 or 2026-03-09")
    snore_mins: float = Field(..., ge=0)
    remedy: str | None = None
    partner_report: str | None = None  # good | bad


class NightVerdictResponse(BaseModel):
    verdict: str  # worked | unclear | didnt_work
    reason: str
    suggest_next: str | None = None
    suggest_next_reason: str | None = None


# ----- Weekly summary (Journey / Tonight "This week" card) -----
class WeeklySummaryResponse(BaseModel):
    summary: str
    snoring_change_pct: int | None = None
    top_remedy: str | None = None


# ----- Recommendations (what to try next) -----
class RecommendationAlternativeResponse(BaseModel):
    remedy: str
    reason: str


class RecommendationNextResponse(BaseModel):
    """GET /api/recommendations/next response."""

    suggested_remedy: str | None = None
    reason: str
    alternatives: list[RecommendationAlternativeResponse] = []
