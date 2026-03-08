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
