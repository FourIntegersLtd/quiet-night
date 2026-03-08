/**
 * Backend-shaped mock data for Journey tab (and reusable across Tab 1 / Tab 4).
 * Mirrors PostgreSQL schema types.
 */

import type {
  User,
  CoupleConnection,
  Experiment,
  LLMInsight,
  RemedyType,
} from "@/types";

// ----- Mock users -----
export const MOCK_SLEEPER: User = {
  id: "sleeper-1",
  role: "SLEEPER",
  first_name: "You",
  created_at: new Date().toISOString(),
};

export const MOCK_PARTNER: User = {
  id: "partner-1",
  role: "PARTNER",
  first_name: "Sarah",
  created_at: new Date().toISOString(),
};

// ----- Mock couple connection -----
export const MOCK_COUPLE_CONNECTION: CoupleConnection = {
  id: "conn-1",
  sleeper_id: MOCK_SLEEPER.id,
  partner_id: MOCK_PARTNER.id,
  status: "ACTIVE",
  current_arrangement: "SEPARATE_ROOMS",
  linked_at: new Date().toISOString(),
};

// ----- Mock experiments -----
const BASE_DATE = "2026-03-01";

export const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: "exp-baseline",
    sleeper_id: MOCK_SLEEPER.id,
    remedy_type: "BASELINE",
    status: "COMPLETED",
    start_date: BASE_DATE,
    end_date: "2026-03-07",
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-nasal",
    sleeper_id: MOCK_SLEEPER.id,
    remedy_type: "NASAL_STRIPS",
    status: "IN_PROGRESS",
    start_date: "2026-03-08",
    end_date: null,
    created_at: new Date().toISOString(),
  },
];

/** Current (in-progress) experiment for UI. */
export const MOCK_CURRENT_EXPERIMENT = MOCK_EXPERIMENTS.find(
  (e) => e.status === "IN_PROGRESS"
) ?? MOCK_EXPERIMENTS[1];

/** Derived: nights completed for current experiment (e.g. 4 of 7). */
export const MOCK_EXPERIMENT_NIGHTS = {
  completed: 4,
  total: 7,
};

// ----- Mock LLM insight -----
export const MOCK_LLM_INSIGHTS: LLMInsight[] = [
  {
    id: "insight-1",
    sleeper_id: MOCK_SLEEPER.id,
    experiment_id: MOCK_CURRENT_EXPERIMENT.id,
    insight_text:
      "This week's pattern: On the two nights you had 3+ drinks, loud snoring doubled and Sarah woke up 4 times. However, the nasal strips test on Thursday was a huge win—zero wake-ups.",
    generated_at: new Date().toISOString(),
    is_read: false,
  },
];

// ----- Correlation data (last 7 days): Sleeper teal vs Partner indigo -----
export const MOCK_CORRELATION_DAYS = [
  { day: "Mon", loud_snore_minutes: 22, disturbance_score: 3, wake_ups: 3 },
  { day: "Tue", loud_snore_minutes: 20, disturbance_score: 2, wake_ups: 2 },
  { day: "Wed", loud_snore_minutes: 18, disturbance_score: 2, wake_ups: 2 },
  { day: "Thu", loud_snore_minutes: 12, disturbance_score: 1, wake_ups: 1 },
  { day: "Fri", loud_snore_minutes: 10, disturbance_score: 1, wake_ups: 0 },
  { day: "Sat", loud_snore_minutes: 14, disturbance_score: 1, wake_ups: 1 },
  { day: "Sun", loud_snore_minutes: 8, disturbance_score: 1, wake_ups: 0 },
];

const MAX_LOUD_MINS = 25;
const MAX_DISTURBANCE = 3;

export function getCorrelationChartHeights(day: (typeof MOCK_CORRELATION_DAYS)[0]) {
  return {
    snoreHeightPercent: (day.loud_snore_minutes / MAX_LOUD_MINS) * 100,
    disturbanceHeightPercent: (day.disturbance_score / MAX_DISTURBANCE) * 100,
  };
}

// ----- Lab screen: aggregated results for current experiment -----
export const MOCK_LAB_OBJECTIVE = {
  volumeDeltaPercent: -15,
  durationDeltaPercent: -10,
};

export const MOCK_LAB_SUBJECTIVE = {
  disturbanceBefore: 3,
  disturbanceAfter: 1,
  leftRoomCount: 0,
};

// ----- Next remedies carousel (exclude BASELINE and current experiment) -----
export const MOCK_NEXT_REMEDIES: { remedy_type: RemedyType; label: string; description: string }[] = [
  {
    remedy_type: "SIDE_SLEEPING",
    label: "Side sleeping",
    description: "Sleep on your side to reduce airway collapse.",
  },
  {
    remedy_type: "NO_ALCOHOL",
    label: "No alcohol",
    description: "Skip alcohol before bed for clearer breathing.",
  },
  {
    remedy_type: "MOUTH_TAPE",
    label: "Mouth tape",
    description: "Gentle tape to encourage nasal breathing.",
  },
];

/** Human-readable label for remedy_type. */
export function getRemedyLabel(remedyType: RemedyType): string {
  const map: Record<RemedyType, string> = {
    BASELINE: "Baseline",
    CPAP: "CPAP",
    MOUTHPIECE: "Mouthpiece",
    MOUTH_TAPE: "Mouth tape",
    NASAL_DILATOR: "Nasal dilator",
    NASAL_SPRAY: "Nasal spray",
    NASAL_STRIPS: "Nasal strips",
    NO_ALCOHOL: "No alcohol",
    SIDE_SLEEPING: "Side sleeping",
 
    THROAT_SPRAY: "Throat spray",
    TONGUE_RETAINER: "Tongue retainer",
    WEDGE_PILLOW: "Wedge pillow",
    AIR_PURIFIER: "Air purifier",
    HUMIDIFIER: "Humidifier",
    ANTI_SNORE_PILLOW: "Anti snore pillow",
    ANTI_HISTAMINES: "Antihistamines",
    CHIN_STRAP: "Chin strap",
  };
  return map[remedyType] ?? remedyType;
}

// ----- Milestone path (5 nodes) -----
export type MilestoneNode = {
  id: number;
  name: string;
  done: boolean;
  current?: boolean;
  objective?: string;
};
export const MOCK_MILESTONES: MilestoneNode[] = [
  { id: 1, name: "Baseline", done: true },
  { id: 2, name: "The Search", done: false, current: true, objective: "Test 2 different remedies to unlock The Breakthrough. (1/2 completed)." },
  { id: 3, name: "The Breakthrough", done: false },
  { id: 4, name: "The Shared Bed", done: false },
  { id: 5, name: "Quiet Harmony", done: false },
];

// ----- Experiment leaderboard (ranked best to worst) -----
export const MOCK_LEADERBOARD: { remedy: string; nights: number; reduction: number | null; avgMins?: number; isWarning?: boolean }[] = [
  { remedy: "Nasal Strips", nights: 4, reduction: 45 },
  { remedy: "Side Sleeping", nights: 2, reduction: 20 },
  { remedy: "Baseline / Nothing", nights: 7, reduction: null, avgMins: 42 },
  { remedy: "Wedge Pillow", nights: 1, reduction: 0, isWarning: true },
];

// ----- Show medical escalation banner (Milestone 3 reached but 0% success) -----
export const MOCK_SHOW_MEDICAL_ESCALATION = false;
