/**
 * Auth & partner linking store (UI-only).
 * Session is stored in Expo SecureStore (Keychain/Keystore). Rest in MMKV.
 * Replace with backend API later.
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

// ----- Session (SecureStore: Keychain on iOS, Keystore on Android) -----
export async function getSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) return null;

    if (__DEV__) {
      console.log("[Session] Raw data length:", raw.length);
    }

    const session = JSON.parse(raw) as AuthSession;

    // When using backend auth, require valid tokens
    if (session.accessToken !== undefined || session.refreshToken !== undefined) {
      if (!session.accessToken || typeof session.accessToken !== "string") {
        if (__DEV__) console.warn("[Session] Invalid access token, clearing");
        await setSession(null);
        return null;
      }
      if (!session.refreshToken || typeof session.refreshToken !== "string") {
        if (__DEV__) console.warn("[Session] Invalid refresh token, clearing");
        await setSession(null);
        return null;
      }
      if (__DEV__) {
        console.log("[Session] access_token length:", session.accessToken.length);
        console.log("[Session] refresh_token length:", session.refreshToken.length);
      }
    }

    // If expired, still return session so the API interceptor can refresh
    if (session.expiresAt != null) {
      const expiresMs =
        session.expiresAt > 1e12 ? session.expiresAt : session.expiresAt * 1000;
      if (Date.now() > expiresMs) {
        if (__DEV__) console.log("[Session] Expired; interceptor will refresh on next request");
      }
    }

    return session;
  } catch (e) {
    if (__DEV__) console.warn("[Session] getSession error:", e);
    return null;
  }
}

export async function setSession(session: AuthSession | null): Promise<void> {
  try {
    if (session === null) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_SESSION);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    }
  } catch {
    // SecureStore can throw if Keychain unavailable (e.g. simulator); ignore
  }
}

/**
 * Clears all local auth data (SecureStore + MMKV auth keys).
 * Use on logout so backend is the single source of truth for session.
 * Does not remove ALL_NIGHTS, NIGHT_*, or APP_TOUR_SEEN.
 */
export async function clearAllAuthData(): Promise<void> {
  await setSession(null);
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
