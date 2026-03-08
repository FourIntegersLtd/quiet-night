/**
 * Shared domain types for nights and snore events.
 */

export interface SnoreEvent {
  id: string;
  confidence: number;
  timestamp: number;
  audioFileUri: string;
}

/** Payload from native snore detector when a snore is detected. */
export interface SnoreDetectedPayload {
  confidence: number;
  timestamp: number;
  audioFileUri: string;
}

/** Pre-flight system check status. */
export type CheckStatus = "idle" | "checking" | "ok" | "warn" | "fail";

/** Room noise test result. */
export type RoomNoiseResult = "quiet" | "moderate" | "loud" | "error";
