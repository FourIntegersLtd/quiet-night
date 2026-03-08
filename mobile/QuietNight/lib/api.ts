/**
 * Backend API client. Uses axios with interceptors for auth and token refresh.
 * Base URL from config/backend. Bearer token is added automatically from session.
 */

import axios, { AxiosError } from "axios";
import { BACKEND_CONFIG } from "@/config/backend";
import { getSession, setSession, clearAllAuthData } from "@/lib/auth-store";

const getApiBaseUrl = () => BACKEND_CONFIG.getBaseUrl();
export const API_BASE_URL = getApiBaseUrl();

const DEFAULT_REQUEST_TIMEOUT_MS = 0;
export const LONG_REQUEST_TIMEOUT_MS = 0;

export type ApiError = { status: number; message: string; detail?: unknown };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

// Request: add Bearer token from session when available
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession();
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
        if (__DEV__) console.log("[API] Added Bearer token to request");
      }
    } catch {
      // ignore
    }
    return config;
  },
  (error) => {
    if (__DEV__) console.warn("[API] Request error", error?.message);
    return Promise.reject(error);
  }
);

// Response: on 401, try refresh then retry; otherwise reject
api.interceptors.response.use(
  (response) => {
    if (__DEV__) console.log(`[API] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (__DEV__) {
      console.warn("[API] Response error", error.response?.status, error.response?.data, error.message);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const session = await getSession();
        if (session?.refreshToken) {
          if (__DEV__) console.log("[API] 401, attempting refresh...");
          const refreshUrl = `${API_BASE_URL}/api/auth/refresh`;
          const res = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: session.refreshToken }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.success && data?.session && data?.user) {
            await setSession({
              userId: data.user.id,
              email: data.user.email ?? session.email,
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresAt: data.session.expires_at,
            });
            if (__DEV__) console.log("[API] Session refreshed, retrying request");
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as Record<string, string>).Authorization =
              `Bearer ${data.session.access_token}`;
            return api(originalRequest);
          }
        }
        await clearAllAuthData();
        if (__DEV__) console.warn("[API] Refresh failed or no refresh token, session cleared");
      } catch (refreshErr) {
        await clearAllAuthData();
        if (__DEV__) console.warn("[API] Refresh error", refreshErr);
      }
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }

    if (error.code === "ECONNREFUSED" && __DEV__) {
      console.warn(`[API] Connection refused. Is the backend running at ${API_BASE_URL}?`);
    }
    return Promise.reject(error);
  }
);

// --- Helpers: axios -> { data?, error? } shape ---
async function get<T>(path: string): Promise<{ data?: T; error?: ApiError }> {
  try {
    const res = await api.get<T>(path);
    return { data: res.data };
  } catch (e) {
    const err = e as AxiosError<{ detail?: unknown }>;
    const status = err.response?.status ?? 0;
    const message =
      (err.response?.data && typeof err.response.data === "object" && "detail" in err.response.data
        ? String((err.response.data as { detail?: unknown }).detail)
        : null) ||
      err.message ||
      `HTTP ${status}`;
    return { error: { status, message, detail: err.response?.data?.detail } };
  }
}

async function post<T>(path: string, body?: unknown): Promise<{ data?: T; error?: ApiError }> {
  try {
    const res = await api.post<T>(path, body);
    return { data: res.data };
  } catch (e) {
    const err = e as AxiosError<{ detail?: unknown }>;
    const status = err.response?.status ?? 0;
    const message =
      (err.response?.data && typeof err.response.data === "object" && "detail" in err.response.data
        ? String((err.response.data as { detail?: unknown }).detail)
        : null) ||
      err.message ||
      `HTTP ${status}`;
    return { error: { status, message, detail: err.response?.data?.detail } };
  }
}

async function patch<T>(path: string, body?: unknown): Promise<{ data?: T; error?: ApiError }> {
  try {
    const res = await api.patch<T>(path, body);
    return { data: res.data };
  } catch (e) {
    const err = e as AxiosError<{ detail?: unknown }>;
    const status = err.response?.status ?? 0;
    const message =
      (err.response?.data && typeof err.response.data === "object" && "detail" in err.response.data
        ? String((err.response.data as { detail?: unknown }).detail)
        : null) ||
      err.message ||
      `HTTP ${status}`;
    return { error: { status, message, detail: err.response?.data?.detail } };
  }
}

export { api };

// --- Auth (signup, signin, signout, refresh) ---

export type AuthSessionData = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

export type AuthUserInfo = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

export type SignInResponse = {
  success: boolean;
  session: AuthSessionData | null;
  user: AuthUserInfo | null;
  error?: string;
};

export type SignUpResponse = {
  success: boolean;
  session: AuthSessionData | null;
  user: AuthUserInfo | null;
  message?: string;
  error?: string;
};

export type RefreshSessionResponse = {
  success: boolean;
  session: AuthSessionData | null;
  user: AuthUserInfo | null;
  error?: string;
};

export async function signInApi(
  email: string,
  password: string
): Promise<{ data?: SignInResponse; error?: ApiError }> {
  return post<SignInResponse>("/api/auth/signin", { email, password });
}

export async function signUpApi(
  email: string,
  password: string,
  full_name?: string | null
): Promise<{ data?: SignUpResponse; error?: ApiError }> {
  return post<SignUpResponse>("/api/auth/signup", {
    email,
    password,
    full_name: full_name ?? undefined,
  });
}

export async function signOutApi(): Promise<{
  data?: { success: boolean };
  error?: ApiError;
}> {
  return post<{ success: boolean }>("/api/auth/signout");
}

export async function refreshSessionApi(
  refresh_token: string
): Promise<{ data?: RefreshSessionResponse; error?: ApiError }> {
  return post<RefreshSessionResponse>("/api/auth/refresh", { refresh_token });
}

// --- Typed endpoints ---

export type MeResponse = {
  id: string;
  email: string | null;
  role: string;
  first_name: string | null;
  onboarding_done: boolean;
  connection: {
    id: string;
    sleeper_id: string;
    partner_id: string;
    status: string;
    linked_at: string | null;
  } | null;
};

export async function healthCheck(): Promise<{ status: string } | null> {
  const { data, error } = await get<{ status: string }>("/health");
  if (error) return null;
  return data ?? null;
}

export async function getMe(): Promise<{ data?: MeResponse; error?: ApiError }> {
  return get<MeResponse>("/api/me");
}

export type UpdateMeBody = {
  first_name?: string | null;
  role?: string | null;
  onboarding_done?: boolean | null;
  has_partner?: boolean | null;
  onboarding_responses?: {
    attribution_source?: string | null;
    prior_app_usage?: string | null;
    role?: string | null;
    sleeping_arrangement?: string | null;
    relationship_severity?: number | null;
    problem_duration?: string | null;
    remedies_tried?: string[] | null;
    primary_goal?: string | null;
    target_weeks?: number | null;
  } | null;
};

export async function updateMe(
  body: UpdateMeBody
): Promise<{ data?: MeResponse; error?: ApiError }> {
  return patch<MeResponse>("/api/me", body);
}

// --- Night insights ---
export type NightInsightsRequest = {
  snore_mins: number;
  peak_time: string;
  remedy_name: string;
  event_count: number;
};

export type NightInsightsResponse = { summary: string };

export async function getNightInsights(
  body: NightInsightsRequest
): Promise<{ data?: NightInsightsResponse; error?: ApiError }> {
  return post<NightInsightsResponse>("/api/insights/night", body);
}

// --- Personalized tip (Tonight screen) ---
export type PersonalizedTipRequest = {
  night_key?: string;
  snore_mins: number;
  peak_time: string;
  event_count: number;
  remedy?: string | null;
  factors?: {
    alcohol_level?: string | null;
    congestion_level?: string | null;
    exhausted_today?: boolean | null;
    worked_out?: boolean | null;
    used_sedative?: boolean | null;
    sick?: boolean | null;
    smoking?: boolean | null;
    caffeine?: boolean | null;
    note?: string | null;
    pre_sleep_other?: string[] | null;
    sleep_quality?: number | null;
    snoring_severity?: number | null;
    disruptions?: string[] | null;
    impact?: string[] | null;
  } | null;
};

export type PersonalizedTipResponse = { tip: string };

export async function getPersonalizedTip(
  body: PersonalizedTipRequest
): Promise<{ data?: PersonalizedTipResponse; error?: ApiError }> {
  return post<PersonalizedTipResponse>("/api/insights/personalized-tip", body);
}

// --- Journey best remedy ---
export type BestRemedyLeaderboardRow = {
  remedy: string;
  nights: number;
  reduction: number | null;
};

export type BestRemedySummaryResponse = {
  title: string;
  remedy_name: string;
  summary: string;
  recommendation: string;
};

export async function getBestRemedySummary(
  leaderboard: BestRemedyLeaderboardRow[]
): Promise<{ data?: BestRemedySummaryResponse; error?: ApiError }> {
  return post<BestRemedySummaryResponse>("/api/journey/best-remedy-summary", { leaderboard });
}
