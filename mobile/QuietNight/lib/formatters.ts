/**
 * Date/time and night-key formatting. Single place for display strings.
 */

/** Extract date part from night key (e.g. "night_2026-03-04" -> "2026-03-04"). */
export function parseNightKey(key: string): string {
  const match = key.match(/night_(.+)/);
  return match ? match[1] : key;
}

/** Format time from Unix timestamp (seconds). */
export function formatTime(unixTime: number): string {
  const date = new Date(unixTime * 1000);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Short time for episode ranges (e.g. "10:20 PM"). */
export function formatTimeShort(unixTime: number): string {
  const date = new Date(unixTime * 1000);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Format night key as long date (e.g. "Wednesday, March 4, 2026"). */
export function formatDateFromKey(key: string): string {
  const dateStr = parseNightKey(key);
  if (dateStr === key) return key;
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return key;
  }
}

/** Format date string YYYY-MM-DD as short label (e.g. "Wed, Mar 4, 2026"). */
export function formatDateLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
