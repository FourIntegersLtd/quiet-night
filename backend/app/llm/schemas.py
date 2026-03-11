"""Pydantic models for LLM structured outputs (e.g. Journey summaries)."""

from pydantic import BaseModel, Field


class BestRemedySummary(BaseModel):
    """Structured output for Journey 'Your best remedy' section."""

    title: str = Field(description="Short headline, e.g. 'Your best remedy so far'")
    remedy_name: str = Field(description="Name of the best-performing remedy")
    summary: str = Field(description="One or two sentences summarizing why it works for them")
    recommendation: str = Field(
        description="Short actionable tip, e.g. 'Keep tracking to compare over time'"
    )


class NightInsightSummary(BaseModel):
    """Structured output for morning screen 'Night Insights'."""

    summary: str = Field(
        description="One or two short, encouraging sentences about last night's snoring: peak time, comparison to baseline, and a brief note on the remedy if mentioned. Warm and non-judgmental tone."
    )


class PersonalizedTip(BaseModel):
    """Structured output for Tonight screen 'Tip of the day' based on last night's sleep."""

    tip: str = Field(
        description="One short, actionable tip (1-2 sentences) tailored to the user based on last night's factors, remedy, notes, and snoring results. Focus on one concrete change they could try tonight. Warm and encouraging."
    )


class RecommendationAlternative(BaseModel):
    """One alternative remedy suggestion with short reason."""

    remedy: str = Field(description="Remedy type name, e.g. NASAL_STRIPS")
    reason: str = Field(description="One short sentence why to try this next")


class RecommendationNextSummary(BaseModel):
    """Structured output for 'What to try next' recommendation."""

    suggested_remedy: str = Field(
        description="Single best remedy type to try next, e.g. NASAL_STRIPS or SIDE_SLEEPING"
    )
    reason: str = Field(
        description="One or two short, encouraging sentences explaining why this remedy is suggested (e.g. nasal first, or you have few nights on it, or good next step after baseline)."
    )
    alternatives: list[RecommendationAlternative] = Field(
        default_factory=list,
        description="Up to 2 other remedies to try, each with a brief reason",
    )


class AllTriedReasonSummary(BaseModel):
    """When user has tried all remedies; LLM acknowledges and encourages."""

    reason: str = Field(
        description="One to three short, warm sentences acknowledging they have tried all options and suggesting next steps (e.g. focus on best performer, retry, or discuss with provider)."
    )


class WeeklySummarySummary(BaseModel):
    """Structured output for 'This week' summary (Journey / Tonight)."""

    summary: str = Field(
        description="One or two short sentences summarizing this week: snoring change vs last week, top remedy if any, partner sleep quality if relevant. Warm and encouraging. Use numbers when provided."
    )


class NightVerdictSummary(BaseModel):
    """Structured output for night-detail 'Did it work?' verdict card."""

    verdict: str = Field(
        description="One of: worked, unclear, didnt_work"
    )
    reason: str = Field(
        description="One or two short sentences explaining the verdict: compare this night's snoring to their baseline, mention remedy and partner report if relevant. Warm and non-judgmental."
    )
    suggest_next: str | None = Field(
        default=None,
        description="Remedy type to try next, e.g. NASAL_STRIPS, or null if no suggestion",
    )
    suggest_next_reason: str | None = Field(
        default=None,
        description="One short sentence why to try that remedy next, or null",
    )
