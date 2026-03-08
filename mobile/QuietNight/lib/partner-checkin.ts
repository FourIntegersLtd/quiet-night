/**
 * Partner check-in: share a link so partner can report how they slept (no app install).
 * Backend will later provide a real token and URL per night.
 */

/** Base URL for partner check-in web form. Backend will append ?t=<token>. */
export const PARTNER_CHECKIN_BASE_URL = "https://quietnight.app/partner/checkin";

/**
 * Returns the share URL for a given night. For now uses a placeholder token.
 * Later: call backend API to create a token for this night and return the full URL.
 */
export function getPartnerCheckInUrl(nightKey: string): string {
  // TODO: Replace with API call: POST /partner/checkin/request { night_key } -> { url }
  const token = "PLACEHOLDER";
  return `${PARTNER_CHECKIN_BASE_URL}?t=${token}`;
}

/** Message to share with the link (email/SMS). */
export const PARTNER_CHECKIN_SHARE_MESSAGE =
  "How did you sleep last night? Tap the link to answer—no app needed.";
