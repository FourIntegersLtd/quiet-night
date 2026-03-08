/**
 * App-wide constants: storage keys, thresholds, durations.
 * Single source of truth for non-theme config.
 */

export const MB = 1024 * 1024;

export const STORAGE_KEYS = {
  ALL_NIGHTS: "all_nights",
  NIGHT_REMEDIES: "night_remedies",
  NIGHT_PARTNER_REPORTS: "night_partner_reports",
  NIGHT_FACTORS: "night_factors",
  NIGHT_RECORDING_TIMES: "night_recording_times",
  /** Auth & onboarding (UI-only; replace with backend later). */
  AUTH_SESSION: "auth_session",
  AUTH_USERS: "auth_users",
  AUTH_ONBOARDING_DONE: "auth_onboarding_done",
  AUTH_INVITE_CODES: "auth_invite_codes",
  AUTH_COUPLE_CONNECTIONS: "auth_couple_connections",
  /** Welcome / app tour shown once */
  APP_TOUR_SEEN: "app_tour_seen",
  /** Latest Epworth Sleepiness Scale result (local) */
  EPWORTH_LAST_RESULT: "epworth_last_result",
  /** 26-step onboarding wizard answers (local until submitted) */
  ONBOARDING_ANSWERS: "onboarding_answers",
} as const;

/** Build night key for a date (e.g. "2026-03-04" -> "night_2026-03-04"). */
export function nightKey(date: Date): string {
  const dateStr = date.toISOString().split("T")[0];
  return `night_${dateStr}`;
}

/** Pre-flight / system check thresholds */
export const LOW_STORAGE_MB = 100;
/** Minimum free space (MB) to allow starting tracking (pre-flight). */
export const PREFLIGHT_MIN_STORAGE_MB = 500;
export const LOW_BATTERY_PCT = 0.2;
export const MAX_RECORDINGS_MB = 500;

/** Room noise test (pre-flight calibration listen duration in seconds) */
export const ROOM_TEST_DURATION_SEC = 6;
export const METER_QUIET = -40;
export const METER_LOUD = -20;
