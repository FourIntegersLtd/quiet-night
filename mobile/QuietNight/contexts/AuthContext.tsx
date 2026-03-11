"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { UserRole } from "@/types";
import type { CoupleConnection } from "@/types";
import type { AuthSession, StoredUser } from "@/lib/auth-store";
import {
  getSession,
  setSession as setSessionStore,
  clearAllAuthData,
  getUsers,
  getUserById,
  addUser,
  updateUser,
  getOnboardingDone,
  setOnboardingDone,
  generateInviteCode,
  consumeInviteCode,
  getConnectionForUser,
  createConnection,
  createUser as createUserInStore,
} from "@/lib/auth-store";
import {
  signInApi,
  signUpApi,
  signOutApi,
  getMe,
  updateMe,
  type MeResponse,
} from "@/lib/api";

type OnboardingData = {
  first_name: string | null;
  role: UserRole;
  has_partner: boolean;
  anonymous_id?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
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

/** Result of signIn/signUp for routing (e.g. onboarded -> tabs, else onboarding). */
export type SignInUpResult = { onboarded: boolean };

type AuthContextValue = {
  session: AuthSession | null;
  user: StoredUser | null;
  isOnboarded: boolean;
  connection: CoupleConnection | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInUpResult>;
  signUp: (email: string, password: string) => Promise<SignInUpResult>;
  signOut: () => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  generatePartnerCode: () => Promise<string>;
  linkWithPartner: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function meToStoredUser(me: MeResponse): StoredUser {
  return {
    id: me.id,
    email: me.email ?? "",
    role: (me.role as UserRole) ?? "SLEEPER",
    first_name: me.first_name,
    created_at: new Date().toISOString(),
    password: "",
    weight_kg: me.weight_kg ?? undefined,
    height_cm: me.height_cm ?? undefined,
    preferred_name: me.preferred_name ?? undefined,
    partner_name: me.partner_name ?? undefined,
  };
}

function meToConnection(me: MeResponse): CoupleConnection | null {
  const c = me.connection;
  if (!c) return null;
  return {
    id: c.id,
    sleeper_id: c.sleeper_id,
    partner_id: c.partner_id,
    status: c.status as CoupleConnection["status"],
    current_arrangement: "SEPARATE_ROOMS",
    linked_at: c.linked_at ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [connection, setConnection] = useState<CoupleConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getSession();
    setSessionState(s);
    if (s?.accessToken) {
      const { data: me, error } = await getMe();
      if (error || !me) {
        setUser(null);
        setIsOnboarded(false);
        setConnection(null);
        return;
      }
      setUser(meToStoredUser(me));
      setIsOnboarded(me.onboarding_done);
      setConnection(meToConnection(me));
    } else if (s) {
      const u = getUserById(s.userId);
      setUser(u);
      setIsOnboarded(getOnboardingDone(s.userId));
      setConnection(getConnectionForUser(s.userId));
    } else {
      setUser(null);
      setIsOnboarded(false);
      setConnection(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInUpResult> => {
      const { data, error } = await signInApi(email, password);
      if (error) throw new Error(error.message ?? "Invalid email or password.");
      if (!data?.success || !data.session || !data.user) {
        throw new Error(data?.error ?? "Sign in failed.");
      }
      const sessionData: AuthSession = {
        userId: data.user.id,
        email: data.user.email ?? email,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      };
      await setSessionStore(sessionData);
      await refresh();
      const { data: me } = await getMe();
      return { onboarded: me?.onboarding_done ?? false };
    },
    [refresh]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignInUpResult> => {
      const { data, error } = await signUpApi(email, password);
      if (error) throw new Error(error.message ?? "Could not create account.");
      if (!data?.success || !data.user) {
        throw new Error(data?.error ?? "Sign up failed.");
      }
      if (!data.session) {
        await refresh();
        return {
          onboarded: false,
        };
      }
      const sessionData: AuthSession = {
        userId: data.user.id,
        email: data.user.email ?? email,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      };
      await setSessionStore(sessionData);
      await refresh();
      const { data: me } = await getMe();
      return { onboarded: me?.onboarding_done ?? false };
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    await signOutApi();
    await clearAllAuthData();
    await refresh();
  }, [refresh]);

  const completeOnboarding = useCallback(
    async (data: OnboardingData) => {
      const s = await getSession();
      if (!s) return;
      if (s.accessToken) {
        const { error } = await updateMe({
          first_name: data.first_name,
          role: data.role,
          onboarding_done: true,
          has_partner: data.has_partner,
          anonymous_id: data.anonymous_id ?? undefined,
          weight_kg: data.weight_kg ?? undefined,
          height_cm: data.height_cm ?? undefined,
          onboarding_responses: data.onboarding_responses ?? undefined,
        });
        if (error) throw new Error(error.message ?? "Could not update profile.");
      } else {
        updateUser(s.userId, {
          first_name: data.first_name,
          role: data.role,
          weight_kg: data.weight_kg ?? undefined,
          height_cm: data.height_cm ?? undefined,
        });
        setOnboardingDone(s.userId);
      }
      await refresh();
    },
    [refresh]
  );

  const generatePartnerCode = useCallback(async () => {
    const s = await getSession();
    if (!s) throw new Error("Not signed in.");
    return generateInviteCode(s.userId);
  }, []);

  const linkWithPartner = useCallback(
    async (code: string) => {
      const s = await getSession();
      if (!s) throw new Error("Not signed in.");
      const invite = consumeInviteCode(code.trim());
      if (!invite) throw new Error("Invalid or expired code.");
      createConnection(invite.sleeper_id, s.userId);
      await refresh();
    },
    [refresh]
  );

  const value: AuthContextValue = {
    session,
    user,
    isOnboarded,
    connection,
    isLoading,
    signIn,
    signUp,
    signOut,
    completeOnboarding,
    generatePartnerCode,
    linkWithPartner,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
