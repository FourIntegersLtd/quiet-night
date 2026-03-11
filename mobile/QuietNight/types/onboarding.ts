/**
 * Types for the 26-step onboarding wizard.
 */

export type OnboardingRole = "SLEEPER" | "PARTNER" | "UNSURE";

export type AttributionSource =
  | "APP_STORE_SEARCH"
  | "TIKTOK_INSTAGRAM"
  | "FRIEND"
  | "DOCTOR"
  | "YOUTUBE"
  | "OTHER";

export type PriorAppUsage = "YES_DIDNT_HELP" | "YES_OKAY" | "NO_FIRST";

export type SleepingArrangement =
  | "SAME_BED_ROOM"
  | "SAME_ROOM_BEDS"
  | "SEPARATE_ROOMS"
  | "SLEEP_ALONE";

export type PrimaryGoal =
  | "SAME_BED"
  | "REDUCE_FOR_PARTNER"
  | "SEE_DOCTOR"
  | "JUST_TRACK";

/** Raw selections from the UI (step-local strings before mapping). */
export interface OnboardingAnswers {
  /** Step 2: user's preferred name for personalisation */
  user_name?: string;
  /** Step 4: asked early so we can show partner screens only when relevant */
  has_partner?: boolean;
  /** Step 5: partner's name and email (when has_partner) */
  partner_name?: string;
  partner_email?: string;
  /** Step 7 */
  attribution_source?: string;
  /** Step 6 */
  prior_app_usage?: string;
  /** Step 7 */
  role?: OnboardingRole;
  /** Step 8 */
  sleeping_arrangement?: SleepingArrangement;
  /** Step 9: 1–5 */
  relationship_severity?: 1 | 2 | 3 | 4 | 5;
  /** Step 10 */
  problem_duration?: string;
  /** Step 11 */
  remedies_tried?: string[];
  /** Step 13 */
  primary_goal?: PrimaryGoal;
  /** Step 14 */
  target_weeks?: number;
  /** Step 22: bedtime reminder time (e.g. "21:00") */
  bedtime_reminder_time?: string;
  /** Step 25: body (for BMI) */
  weight_kg?: number;
  height_cm?: number;
}

/** Payload sent to POST /api/onboarding/complete or PATCH /api/me */
export interface OnboardingCompletionPayload {
  user_name?: string;
  has_partner?: boolean;
  partner_name?: string;
  partner_email?: string;
  attribution_source?: string;
  prior_app_usage?: string;
  role?: OnboardingRole;
  sleeping_arrangement?: SleepingArrangement;
  relationship_severity?: number;
  problem_duration?: string;
  remedies_tried?: string[];
  primary_goal?: PrimaryGoal;
  target_weeks?: number;
  bedtime_reminder_time?: string;
  weight_kg?: number;
  height_cm?: number;
}
