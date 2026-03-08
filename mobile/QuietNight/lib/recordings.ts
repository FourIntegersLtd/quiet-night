/**
 * Snore recording file helpers: size, count, clear. Uses Paths.document and constants.
 */

import { Paths, File } from "expo-file-system";

import { MB } from "@/constants/app";

function isWavFile(item: unknown): item is File {
  return (
    item != null &&
    typeof item === "object" &&
    "name" in item &&
    "size" in item &&
    typeof (item as File).name === "string" &&
    (item as File).name.startsWith("snore_") &&
    (item as File).name.endsWith(".wav")
  );
}

export function getRecordingsSizeMB(): number {
  try {
    const doc = Paths.document;
    if (!doc.exists) return 0;
    let totalBytes = 0;
    for (const item of doc.list()) {
      if (isWavFile(item)) totalBytes += item.size;
    }
    return totalBytes / MB;
  } catch {
    return 0;
  }
}

export function getWavFileCount(): number {
  try {
    const doc = Paths.document;
    if (!doc.exists) return 0;
    return doc.list().filter(isWavFile).length;
  } catch {
    return 0;
  }
}

export function getAvailableSpaceMB(): number {
  try {
    return Paths.availableDiskSpace / MB;
  } catch {
    return 0;
  }
}

export function clearWavRecordings(): void {
  const doc = Paths.document;
  if (!doc.exists) return;
  const toDelete = doc.list().filter(isWavFile);
  for (const file of toDelete) {
    try {
      file.delete();
    } catch {
      // ignore per-file errors
    }
  }
}

/** Parse Unix timestamp from snore_<timestamp>.wav; returns null if invalid. */
function getTimestampFromWavName(name: string): number | null {
  const match = name.match(/^snore_(\d+)\.wav$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Deletes only snore wav files older than the given number of days (by filename timestamp).
 * Keeps the most recent `days` days of recordings.
 */
export function clearWavRecordingsOlderThanDays(days: number): void {
  const doc = Paths.document;
  if (!doc.exists) return;
  const cutoffSec = Date.now() / 1000 - days * 24 * 60 * 60;
  const files = doc.list().filter(isWavFile);
  for (const file of files) {
    const ts = getTimestampFromWavName(file.name);
    if (ts != null && ts < cutoffSec) {
      try {
        file.delete();
      } catch {
        // ignore per-file errors
      }
    }
  }
}
