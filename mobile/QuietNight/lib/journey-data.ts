/**
 * Journey tab: derive last-7-days, leaderboard, and winning remedy from real night data.
 */

import { nightKey } from "@/constants/app";
import {
  getAllNightKeys,
  getNightSnores,
  getNightRemedy,
  getNightPartnerReport,
} from "@/lib/nights";
import { parseNightKey } from "@/lib/formatters";
import type { RemedyType } from "@/types";

const SECONDS_PER_SNORE = 5;

const REMEDY_LABELS: Record<RemedyType, string> = {
  BASELINE: "Baseline / Nothing",
  CPAP: "CPAP",
  MOUTHPIECE: "Mouthpiece",
  MOUTH_TAPE: "Mouth Tape",
  NASAL_DILATOR: "Nasal Dilator",
  NASAL_SPRAY: "Nasal Spray",
  NASAL_STRIPS: "Nasal Strips",
  NO_ALCOHOL: "No Alcohol",
  SIDE_SLEEPING: "Side Sleeping",
  THROAT_SPRAY: "Throat Spray",
  TONGUE_RETAINER: "Tongue Retainer",
  WEDGE_PILLOW: "Wedge Pillow",
  AIR_PURIFIER: "Air Purifier",
  HUMIDIFIER: "Humidifier",
  ANTI_SNORE_PILLOW: "Anti Snore Pillow",
  ANTI_HISTAMINES: "Antihistamines",
  CHIN_STRAP: "Chin Strap",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()];
}

function loudMinsFromEvents(eventCount: number): number {
  return Math.round((eventCount * SECONDS_PER_SNORE) / 60);
}

/** One day in the last-7 calendar (sleeper + partner report). */
export type JourneyDay = {
  day: string;
  dateStr: string;
  loudMins: number;
  remedy: RemedyType | null;
  sleeperQuiet: boolean;
  /** Partner: true = slept great, false = exhausted, null = no report. */
  partnerGood: boolean | null;
};

/** Last 7 calendar days, most recent last (Mon..Sun order for display). */
export function getLast7DaysJourneyData(): JourneyDay[] {
  const out: JourneyDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = nightKey(d);
    const events = getNightSnores(key);
    const remedies = getNightRemedy(key);
    const remedyKey = remedies.length ? remedies.slice().sort().join(",") : "";
    const partnerReport = getNightPartnerReport(key);
    const loudMins = loudMinsFromEvents(events.length);
    const dateStr = d.toISOString().split("T")[0];
    out.push({
      day: getDayLabel(d),
      dateStr,
      loudMins,
      remedy: remedyKey,
      sleeperQuiet: loudMins <= 12,
      partnerGood: partnerReport === "good" ? true : partnerReport === "bad" ? false : null,
    });
  }
  return out;
}

export type LeaderboardRow = {
  remedy: string;
  nights: number;
  reduction: number | null;
  avgMins?: number;
  isWarning?: boolean;
};

/** Leaderboard from real nights: group by remedy, reduction vs baseline. */
export function getLeaderboardFromRealData(): LeaderboardRow[] {
  const keys = getAllNightKeys();
  const byRemedy: Record<string, { mins: number[] }> = {};

  for (const key of keys) {
    const remedies = getNightRemedy(key);
    const remedyKey = remedies.length ? remedies.slice().sort().join(",") : "BASELINE";
    const events = getNightSnores(key);
    const mins = loudMinsFromEvents(events.length);
    if (!byRemedy[remedyKey]) byRemedy[remedyKey] = { mins: [] };
    byRemedy[remedyKey].mins.push(mins);
  }

  const baselineMins = byRemedy.BASELINE?.mins ?? [];
  const baselineAvg =
    baselineMins.length > 0
      ? baselineMins.reduce((a, b) => a + b, 0) / baselineMins.length
      : null;

  const rows: LeaderboardRow[] = [];
  const remedyTypes: RemedyType[] = [
    "BASELINE",
    "CPAP",
    "MOUTHPIECE",
    "SIDE_SLEEPING",
    "MOUTH_TAPE",
    "TONGUE_RETAINER",
    "NASAL_STRIPS",
    "NASAL_DILATOR",
    "NASAL_SPRAY",
    "THROAT_SPRAY",
    "WEDGE_PILLOW",
    "AIR_PURIFIER",
    "HUMIDIFIER",
    "ANTI_SNORE_PILLOW",
    "ANTI_HISTAMINES",
    "CHIN_STRAP",
    "NO_ALCOHOL",
  ];
  for (const remedy of remedyTypes) {
    const data = byRemedy[remedy];
    if (!data || data.mins.length === 0) continue;
    const nights = data.mins.length;
    const avgMins =
      data.mins.reduce((a, b) => a + b, 0) / data.mins.length;
    let reduction: number | null = null;
    let isWarning = false;
    if (remedy !== "BASELINE" && baselineAvg != null && baselineAvg > 0) {
      reduction = Math.round(
        ((baselineAvg - avgMins) / baselineAvg) * 100
      );
      if (nights === 1 && reduction <= 0) isWarning = true;
    }
    rows.push({
      remedy: REMEDY_LABELS[remedy],
      nights,
      reduction,
      avgMins: remedy === "BASELINE" ? Math.round(avgMins) : undefined,
      isWarning,
    });
  }
  // Sort: best reduction first, then baseline, then by nights
  rows.sort((a, b) => {
    if (a.remedy === "Baseline / Nothing") return 1;
    if (b.remedy === "Baseline / Nothing") return -1;
    const rA = a.reduction ?? -Infinity;
    const rB = b.reduction ?? -Infinity;
    return rB - rA;
  });
  return rows;
}

export type WinningRemedy = {
  remedyLabel: string;
  reductionPercent: number;
  nights: number;
} | null;

/** Best remedy (highest reduction with at least 1 night) for hero card. */
export function getWinningRemedyFromRealData(): WinningRemedy {
  const leaderboard = getLeaderboardFromRealData();
  const best = leaderboard.find(
    (r) => r.reduction != null && r.reduction > 0 && r.remedy !== "Baseline / Nothing"
  );
  if (!best || best.reduction == null) return null;
  return {
    remedyLabel: best.remedy,
    reductionPercent: best.reduction,
    nights: best.nights,
  };
}

/** Simple milestone progress from night count (for path). */
export function getMilestoneProgress(): {
  totalNights: number;
  currentStep: number;
  objective: string;
} {
  const keys = getAllNightKeys();
  const totalNights = keys.length;
  let currentStep = 1;
  let objective = "Record your first night to start.";
  if (totalNights >= 1) {
    currentStep = 2;
    objective = "Test different remedies to find what works. (Track nights from the Tonight tab.)";
  }
  if (totalNights >= 7) {
    currentStep = 3;
    objective = "You've completed a week of data. Check your leaderboard below.";
  }
  return { totalNights, currentStep, objective };
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

/** Snore score by month: average loud minutes per night in that month (for Journey graph). */
export type SnoreScoreByMonth = {
  monthKey: string;
  monthLabel: string;
  score: number;
  nights: number;
};

export function getSnoreScoresByMonth(): SnoreScoreByMonth[] {
  const keys = getAllNightKeys();
  const byMonth: Record<string, number[]> = {};
  for (const key of keys) {
    const dateStr = parseNightKey(key);
    const [y, m] = dateStr.split("-");
    if (!y || !m) continue;
    const monthKey = `${y}-${m}`;
    const events = getNightSnores(key);
    const mins = loudMinsFromEvents(events.length);
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(mins);
  }
  const sortedMonths = Object.keys(byMonth).sort();
  return sortedMonths.map((monthKey) => {
    const mins = byMonth[monthKey];
    const [y, m] = monthKey.split("-");
    const monthLabel = m && y ? `${MONTH_LABELS[m] ?? m} ${y}` : monthKey;
    const score =
      mins.length > 0
        ? Math.round(
            mins.reduce((a, b) => a + b, 0) / mins.length
          )
        : 0;
    return { monthKey, monthLabel, score, nights: mins.length };
  });
}
