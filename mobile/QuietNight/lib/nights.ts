/**
 * Night session and snore list API. Uses lib/storage and constants for keys.
 */

import { STORAGE_KEYS, nightKey } from "@/constants/app";
import type { SnoreEvent } from "@/types";
import type { RemedyType, AlcoholLevel, CongestionLevel } from "@/types";
import { getStorage } from "./storage";
import { parseNightKey, formatDateLabel } from "./formatters";

/** Seconds per snore event for estimated "loud snoring" duration (matches morning screen). */
const SECONDS_PER_SNORE = 30;

export function getAllNightKeys(): string[] {
  const raw = getStorage().getString(STORAGE_KEYS.ALL_NIGHTS);
  if (!raw) return [];
  try {
    const keys: unknown = JSON.parse(raw);
    return Array.isArray(keys) ? (keys as string[]) : [];
  } catch {
    return [];
  }
}

/** Most recent night key that is before today (for "last night" summary). */
export function getLastNightKey(): string | null {
  const today = getTodayNightKey();
  const all = getAllNightKeys();
  const sorted = [...all].sort().reverse();
  const past = sorted.filter((k) => k < today);
  return past[0] ?? null;
}

function getPeakTimeLabel(events: SnoreEvent[]): string {
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const e of events) {
    const hour = new Date(e.timestamp * 1000).getHours();
    if (hour >= 0 && hour < 24) byHour[hour]++;
  }
  let maxCount = 0;
  let peakStart = 0;
  for (let h = 0; h < 24; h++) {
    if (byHour[h] > maxCount) {
      maxCount = byHour[h];
      peakStart = h;
    }
  }
  if (maxCount === 0) return "—";
  const fmt = (h: number) => {
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    return h < 12 ? `${h}a` : `${h - 12}p`;
  };
  return `${fmt(peakStart)}–${fmt(peakStart + 1)}`;
}

/** Summary for the most recent past night (for no-partner card on Tonight). */
export function getLastNightSummary(): {
  dateLabel: string;
  loudMins: number;
  peakTime: string;
  eventCount: number;
} | null {
  const key = getLastNightKey();
  if (!key) return null;
  const events = getNightSnores(key);
  const dateStr = parseNightKey(key);
  const dateLabel = formatDateLabel(dateStr);
  const estimatedSec = events.length * SECONDS_PER_SNORE;
  const loudMins = Math.round(estimatedSec / 60);
  const peakTime = getPeakTimeLabel(events);
  return { dateLabel, loudMins, peakTime, eventCount: events.length };
}

export function getNightSnores(key: string): SnoreEvent[] {
  const raw = getStorage().getString(key);
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? (list as SnoreEvent[]) : [];
  } catch {
    return [];
  }
}

export function addSnoreToNight(key: string, snore: SnoreEvent): void {
  const list = getNightSnores(key);
  const updated = [snore, ...list];
  getStorage().set(key, JSON.stringify(updated));
}

/** Ensure a night key is in the all_nights list (call when starting a session). */
export function ensureNightInList(key: string): void {
  const raw = getStorage().getString(STORAGE_KEYS.ALL_NIGHTS);
  let all: string[] = raw ? JSON.parse(raw) : [];
  if (!all.includes(key)) {
    all.push(key);
    getStorage().set(STORAGE_KEYS.ALL_NIGHTS, JSON.stringify(all));
  }
}

/** Get stored remedies for a night (set when user starts tracking). Multi-select supported. */
export function getNightRemedy(key: string): RemedyType[] {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_REMEDIES);
  if (!raw) return [];
  try {
    const map: unknown = JSON.parse(raw);
    if (map && typeof map === "object" && key in map) {
      const v = (map as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as RemedyType[];
      if (typeof v === "string") return [v as RemedyType]; // backward compat: single remedy
    }
  } catch {}
  return [];
}

/** Set remedies for a night (call from wizard or active screen). Supports multi-select. */
export function setNightRemedy(key: string, remedies: RemedyType[]): void {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_REMEDIES);
  const map: Record<string, RemedyType[]> = raw ? JSON.parse(raw) : {};
  map[key] = remedies.length ? remedies : ["BASELINE"];
  getStorage().set(STORAGE_KEYS.NIGHT_REMEDIES, JSON.stringify(map));
}

/** Partner report for a night: good = slept well, bad = exhausted. */
export type PartnerReport = "good" | "bad";

/** Get stored partner report for a night (set from morning screen). */
export function getNightPartnerReport(key: string): PartnerReport | null {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_PARTNER_REPORTS);
  if (!raw) return null;
  try {
    const map: unknown = JSON.parse(raw);
    if (map && typeof map === "object" && key in map) {
      const v = (map as Record<string, string>)[key];
      return v === "good" || v === "bad" ? v : null;
    }
  } catch {}
  return null;
}

/** Set partner report for a night (call from morning screen). */
export function setNightPartnerReport(key: string, report: PartnerReport): void {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_PARTNER_REPORTS);
  const map: Record<string, string> = raw ? JSON.parse(raw) : {};
  map[key] = report;
  getStorage().set(STORAGE_KEYS.NIGHT_PARTNER_REPORTS, JSON.stringify(map));
}

/** Per-night factors (alcohol, congestion, exhaustion, etc.) — set after pre-flight / wizard. */
export type NightFactors = {
  alcohol_level: AlcoholLevel;
  congestion_level: CongestionLevel;
  exhausted_today?: boolean;
  worked_out?: boolean;
  used_sedative?: boolean;
  sick?: boolean;
  smoking?: boolean;
  caffeine?: boolean;
  /** Optional note (e.g. "Late dinner", "Stressful day"). */
  note?: string;
  /** 1–10 from wizard sliders */
  sleep_quality?: number;
  snoring_severity?: number;
  /** Icon ids from wizard grids */
  disruptions?: string[];
  impact?: string[];
  /** Extra pre-sleep factor ids (e.g. late_meal, stress, screen_time) */
  pre_sleep_other?: string[];
  /** Sleep sound chosen in pre-flight; plays only when tracking is active */
  sleep_sound?: "none" | "rain" | "stream" | "white_noise";
};

/** Get stored factors for a night. */
export function getNightFactors(key: string): NightFactors | null {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_FACTORS);
  if (!raw) return null;
  try {
    const map: unknown = JSON.parse(raw);
    if (map && typeof map === "object" && key in map) {
      return (map as Record<string, NightFactors>)[key] ?? null;
    }
  } catch {}
  return null;
}

/** Set factors for a night (call after factors modal confirm). */
export function setNightFactors(key: string, factors: NightFactors): void {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_FACTORS);
  const map: Record<string, NightFactors> = raw ? JSON.parse(raw) : {};
  map[key] = factors;
  getStorage().set(STORAGE_KEYS.NIGHT_FACTORS, JSON.stringify(map));
}

/** Get the current session key for today. */
export function getTodayNightKey(): string {
  return nightKey(new Date());
}

/** Recording start/stop timestamps (Unix seconds). */
export type RecordingTimes = { startedAt: number; stoppedAt?: number };

export function setRecordingStarted(key: string): void {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_RECORDING_TIMES);
  const map: Record<string, RecordingTimes> = raw ? JSON.parse(raw) : {};
  map[key] = { startedAt: Date.now() / 1000 };
  getStorage().set(STORAGE_KEYS.NIGHT_RECORDING_TIMES, JSON.stringify(map));
}

export function setRecordingStopped(key: string): void {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_RECORDING_TIMES);
  const map: Record<string, RecordingTimes> = raw ? JSON.parse(raw) : {};
  if (map[key]) {
    map[key].stoppedAt = Date.now() / 1000;
  } else {
    map[key] = { startedAt: Date.now() / 1000, stoppedAt: Date.now() / 1000 };
  }
  getStorage().set(STORAGE_KEYS.NIGHT_RECORDING_TIMES, JSON.stringify(map));
}

export function getRecordingTimes(key: string): RecordingTimes | null {
  const raw = getStorage().getString(STORAGE_KEYS.NIGHT_RECORDING_TIMES);
  if (!raw) return null;
  try {
    const map: Record<string, RecordingTimes> = JSON.parse(raw);
    return map[key] ?? null;
  } catch {
    return null;
  }
}

/** Time-in-bed and snoring stats for a night (for night detail screen). */
export function getNightTimeStats(key: string): {
  totalMinutes: number;
  snoringMinutes: number;
  snoringPercent: number;
} {
  const events = getNightSnores(key);
  const snoringSeconds = events.length * SECONDS_PER_SNORE;
  const snoringMinutes = events.length > 0 ? Math.max(1, Math.round(snoringSeconds / 60)) : 0;
  if (events.length === 0) {
    const times = getRecordingTimes(key);
    if (times?.stoppedAt) {
      const totalMinutes = Math.round((times.stoppedAt - times.startedAt) / 60);
      return { totalMinutes: Math.max(0, totalMinutes), snoringMinutes: 0, snoringPercent: 0 };
    }
    return { totalMinutes: 0, snoringMinutes: 0, snoringPercent: 0 };
  }
  const times = getRecordingTimes(key);
  let totalMinutes: number;
  if (times?.stoppedAt) {
    totalMinutes = Math.max(1, Math.round((times.stoppedAt - times.startedAt) / 60));
  } else {
    const timestamps = events.map((e) => e.timestamp).sort((a, b) => a - b);
    const spanSeconds = Math.max(60, timestamps[timestamps.length - 1] - timestamps[0]);
    totalMinutes = Math.round(spanSeconds / 60);
  }
  const snoringPercent =
    totalMinutes > 0
      ? Math.min(100, (snoringMinutes / totalMinutes) * 100)
      : 0;
  return { totalMinutes, snoringMinutes, snoringPercent };
}
