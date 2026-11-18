"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { syncProfile } from "@/lib/auth/syncProfile";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User, profile?: { full_name?: string | null; avatar_url?: string | null }): AuthUser {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || "",
    fullName:
      profile?.full_name ||
      (meta.full_name as string) ||
      (meta.name as string) ||
      (user.email?.split("@")[0] ?? "Account"),
    avatarUrl: profile?.avatar_url || (meta.avatar_url as string) || (meta.picture as string) || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback(async (next: User | null) => {
    if (!next) {
      setUser(null);
      return;
    }
    const supabase = createClient();
    await syncProfile(supabase, next);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", next.id)
      .maybeSingle();
    setUser(toAuthUser(next, profile || undefined));
  }, []);

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    setSession(s);
    await applyUser(s?.user ?? null);
  }, [applyUser]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await applyUser(data.session?.user ?? null);
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      await applyUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyUser]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, signOut, refreshUser }),
    [user, session, loading, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
