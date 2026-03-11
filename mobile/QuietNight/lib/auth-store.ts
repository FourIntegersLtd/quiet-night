/**
 * Auth & partner linking store (UI-only).
 * Session is stored in Expo SecureStore (Keychain/Keystore) and mirrored in MMKV
 * so it persists across app restarts when SecureStore is unavailable (e.g. simulator).
 * Rest of auth data in MMKV.
 */

import * as SecureStore from "expo-secure-store";
import { getStorage } from "./storage";
import { STORAGE_KEYS } from "@/constants/app";
import type { User, UserRole, CoupleConnection, ConnectionStatus } from "@/types";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/** Stored user with credentials (demo only; do not use in production). */
export interface StoredUser extends User {
  email: string;
  password: string;
  /** From onboarding: "what they'd like to be called" */
  preferred_name?: string | null;
  /** From onboarding: partner's name */
  partner_name?: string | null;
}

export interface AuthSession {
  userId: string;
  email: string;
  /** Backend JWT for API calls (Bearer). Present when using backend auth. */
  accessToken?: string;
  /** Used to refresh session via POST /api/auth/refresh. */
  refreshToken?: string;
  /** Unix timestamp (seconds) when access token expires. */
  expiresAt?: number;
}

export interface PendingInvite {
  code: string;
  sleeper_id: string;
  created_at: string;
}

const storage = () => getStorage();

// ----- Session (SecureStore + MMKV fallback so it persists after app close) -----
function parseAndValidateSession(raw: string): AuthSession | null {
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (session.accessToken !== undefined || session.refreshToken !== undefined) {
      if (!session.accessToken || typeof session.accessToken !== "string") return null;
      if (!session.refreshToken || typeof session.refreshToken !== "string") return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    let raw: string | null = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) {
      const mmkvRaw = storage().getString(STORAGE_KEYS.AUTH_SESSION);
      raw = mmkvRaw ?? null;
      if (raw && __DEV__) console.log("[Session] Restored from MMKV fallback");
      if (raw) {
        try {
          await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_SESSION, raw);
        } catch {
          // Keychain may still be unavailable; keep using MMKV
        }
      }
    }
    if (!raw) return null;

    if (__DEV__) console.log("[Session] Raw data length:", raw.length);

    const session = parseAndValidateSession(raw);
    if (!session) {
      if (__DEV__) console.warn("[Session] Invalid session data, clearing");
      await setSession(null);
      return null;
    }

    if (__DEV__ && session.accessToken) {
      console.log("[Session] access_token length:", session.accessToken.length);
      console.log("[Session] refresh_token length:", session.refreshToken?.length ?? 0);
    }

    if (session.expiresAt != null) {
      const expiresMs =
        session.expiresAt > 1e12 ? session.expiresAt : session.expiresAt * 1000;
      if (Date.now() > expiresMs && __DEV__) {
        console.log("[Session] Expired; interceptor will refresh on next request");
      }
    }

    return session;
  } catch (e) {
    if (__DEV__) console.warn("[Session] getSession error:", e);
    return null;
  }
}

export async function setSession(session: AuthSession | null): Promise<void> {
  const json = session === null ? "" : JSON.stringify(session);
  try {
    if (session === null) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_SESSION);
      storage().delete(STORAGE_KEYS.AUTH_SESSION);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_SESSION, json);
      storage().set(STORAGE_KEYS.AUTH_SESSION, json);
    }
  } catch {
    if (session !== null) {
      storage().set(STORAGE_KEYS.AUTH_SESSION, json);
    } else {
      storage().delete(STORAGE_KEYS.AUTH_SESSION);
    }
  }
}

/**
 * Clears all local auth data (SecureStore + MMKV auth keys).
 * Use on logout so backend is the single source of truth for session.
 * Does not remove ALL_NIGHTS, NIGHT_*, or APP_TOUR_SEEN.
 */
export async function clearAllAuthData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_SESSION);
  } catch {}
  storage().delete(STORAGE_KEYS.AUTH_SESSION);
  const s = storage();
  s.delete(STORAGE_KEYS.AUTH_USERS);
  s.delete(STORAGE_KEYS.AUTH_ONBOARDING_DONE);
  s.delete(STORAGE_KEYS.AUTH_INVITE_CODES);
  s.delete(STORAGE_KEYS.AUTH_COUPLE_CONNECTIONS);
}

// ----- Users -----
export function getUsers(): StoredUser[] {
  const raw = storage().getString(STORAGE_KEYS.AUTH_USERS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function setUsers(users: StoredUser[]): void {
  storage().set(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
}

export function getUserById(id: string): StoredUser | null {
  return getUsers().find((u) => u.id === id) ?? null;
}

export function getUserByEmail(email: string): StoredUser | null {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function addUser(user: StoredUser): void {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  users.push(user);
  setUsers(users);
}

export function updateUser(userId: string, patch: Partial<StoredUser>): void {
  const users = getUsers();
  const i = users.findIndex((u) => u.id === userId);
  if (i === -1) return;
  users[i] = { ...users[i], ...patch };
  setUsers(users);
}

// ----- Onboarding -----
export function getOnboardingDone(userId: string): boolean {
  const raw = storage().getString(STORAGE_KEYS.AUTH_ONBOARDING_DONE);
  if (!raw) return false;
  try {
    const set = JSON.parse(raw) as string[];
    return set.includes(userId);
  } catch {
    return false;
  }
}

export function setOnboardingDone(userId: string): void {
  const raw = storage().getString(STORAGE_KEYS.AUTH_ONBOARDING_DONE);
  const set: string[] = raw ? JSON.parse(raw) : [];
  if (!set.includes(userId)) {
    set.push(userId);
    storage().set(STORAGE_KEYS.AUTH_ONBOARDING_DONE, JSON.stringify(set));
  }
}

// ----- Invite codes (6-digit, sleeper generates; partner enters) -----
export function generateInviteCode(sleeperId: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const raw = storage().getString(STORAGE_KEYS.AUTH_INVITE_CODES);
  const map: Record<string, PendingInvite> = raw ? JSON.parse(raw) : {};
  map[code] = { code, sleeper_id: sleeperId, created_at: new Date().toISOString() };
  storage().set(STORAGE_KEYS.AUTH_INVITE_CODES, JSON.stringify(map));
  return code;
}

export function getInviteByCode(code: string): PendingInvite | null {
  const raw = storage().getString(STORAGE_KEYS.AUTH_INVITE_CODES);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, PendingInvite>;
    return map[code] ?? null;
  } catch {
    return null;
  }
}

export function consumeInviteCode(code: string): PendingInvite | null {
  const invite = getInviteByCode(code);
  if (!invite) return null;
  const raw = storage().getString(STORAGE_KEYS.AUTH_INVITE_CODES);
  const map: Record<string, PendingInvite> = raw ? JSON.parse(raw) : {};
  delete map[code];
  storage().set(STORAGE_KEYS.AUTH_INVITE_CODES, JSON.stringify(map));
  return invite;
}

// ----- Couple connections -----
export function getConnections(): CoupleConnection[] {
  const raw = storage().getString(STORAGE_KEYS.AUTH_COUPLE_CONNECTIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CoupleConnection[];
  } catch {
    return [];
  }
}

function setConnections(conns: CoupleConnection[]): void {
  storage().set(STORAGE_KEYS.AUTH_COUPLE_CONNECTIONS, JSON.stringify(conns));
}

export function getConnectionForUser(userId: string): CoupleConnection | null {
  return (
    getConnections().find(
      (c) => (c.sleeper_id === userId || c.partner_id === userId) && c.status === "ACTIVE"
    ) ?? null
  );
}

export function createConnection(sleeperId: string, partnerId: string): CoupleConnection {
  const conns = getConnections();
  const existing = conns.find(
    (c) =>
      (c.sleeper_id === sleeperId && c.partner_id === partnerId) ||
      (c.sleeper_id === partnerId && c.partner_id === sleeperId)
  );
  if (existing) {
    const updated = { ...existing, status: "ACTIVE" as ConnectionStatus };
    setConnections(conns.map((c) => (c.id === existing.id ? updated : c)));
    return updated;
  }
  const conn: CoupleConnection = {
    id: uuid(),
    sleeper_id: sleeperId,
    partner_id: partnerId,
    status: "ACTIVE",
    current_arrangement: "SEPARATE_ROOMS",
    linked_at: new Date().toISOString(),
  };
  conns.push(conn);
  setConnections(conns);
  return conn;
}

export function createUser(
  email: string,
  password: string,
  role: UserRole,
  firstName: string | null
): StoredUser {
  const user: StoredUser = {
    id: uuid(),
    role,
    first_name: firstName,
    email,
    password,
    created_at: new Date().toISOString(),
  };
  addUser(user);
  return user;
}
