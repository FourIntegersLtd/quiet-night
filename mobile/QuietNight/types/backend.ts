/**
 * TypeScript types mirroring the PostgreSQL backend schema.
 * Use for mock data and future API responses.
 */

// ----- Enums / unions (match SQL CHECK constraints) -----

export type UserRole = "SLEEPER" | "PARTNER" | "BOTH";

export type ConnectionStatus = "PENDING" | "ACTIVE" | "UNLINKED";

export type CurrentArrangement =
  | "ALWAYS_SHARED"
  | "SEPARATE_ROOMS"
  | "TRIAL_SHARING";

export type RemedyType =
  | "BASELINE"
  | "CPAP"
  | "MOUTHPIECE"
  | "SIDE_SLEEPING"
  | "MOUTH_TAPE"
  | "TONGUE_RETAINER"
  | "NASAL_STRIPS"
  | "NASAL_DILATOR"
  | "NASAL_SPRAY"
  | "THROAT_SPRAY"
  | "WEDGE_PILLOW"
  | "AIR_PURIFIER"
  | "NO_ALCOHOL"
  | "HUMIDIFIER"
  | "ANTI_SNORE_PILLOW"
  | "ANTI_HISTAMINES"
  | "CHIN_STRAP";

export type ExperimentStatus =
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ABANDONED"
  | "SET_AS_ROUTINE";

export type AlcoholLevel = "NONE" | "1_TO_2" | "3_PLUS";

export type CongestionLevel = "CLEAR" | "MILD" | "BLOCKED";

// ----- Table interfaces -----

export interface User {
  id: string;
  role: UserRole;
  first_name: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  created_at?: string;
  push_token?: string | null;
}

export interface CoupleConnection {
  id: string;
  sleeper_id: string;
  partner_id: string;
  status: ConnectionStatus;
  current_arrangement: CurrentArrangement;
  linked_at?: string;
}

export interface Experiment {
  id: string;
  sleeper_id: string;
  remedy_type: RemedyType;
  status: ExperimentStatus;
  start_date: string;
  end_date: string | null;
  created_at?: string;
}

export interface SleepSession {
  id: string;
  sleeper_id: string;
  experiment_id: string | null;
  is_shared_room_night?: boolean;
  alcohol_level?: AlcoholLevel | null;
  congestion_level?: CongestionLevel | null;
  remedy_applied?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  total_duration_minutes?: number | null;
  snore_percentage?: number | null;
  loud_snore_minutes?: number | null;
  waveform_metadata?: unknown;
  created_at?: string;
}

export interface PartnerLog {
  id: string;
  session_id: string;
  partner_id: string;
  disturbance_score?: number | null;
  wake_ups?: number;
  left_room?: boolean;
  hopefulness_score?: number | null;
  created_at?: string;
}

export interface LLMInsight {
  id: string;
  sleeper_id: string;
  experiment_id: string | null;
  insight_text: string;
  generated_at?: string;
  is_read?: boolean;
}

export interface EpworthAssessment {
  id: string;
  user_id: string;
  total_score: number;
  answers_json: unknown;
  completed_at?: string;
}
