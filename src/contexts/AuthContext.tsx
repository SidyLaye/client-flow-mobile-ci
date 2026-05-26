import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, ApiError, entrepreneurStore, tokenStore } from "@/lib/api";
import type { MeResponse, UserRoleEntry } from "@/lib/api-types";

interface AuthContextValue {
  user: MeResponse["user"] | null;
  roles: UserRoleEntry[];
  activeEntrepreneurId: string | null;
  loading: boolean;
  // True only after a successful refresh that produced both a user and an active tenant.
  isAuthenticated: boolean;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setActiveEntrepreneur: (id: string) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [roles, setRoles] = useState<UserRoleEntry[]>([]);
  const [activeEntrepreneurId, setActiveEntrepreneurIdState] = useState<string | null>(
    () => entrepreneurStore.get(),
  );
  const [loading, setLoading] = useState(true);

  const setActiveEntrepreneur = useCallback((id: string) => {
    entrepreneurStore.set(id);
    setActiveEntrepreneurIdState(id);
  }, []);

  const fetchMe = useCallback(async (): Promise<MeResponse | null> => {
    try {
      const me = await api.auth.me();
      setUser(me.user);
      setRoles(me.roles);

      // If no active tenant is selected yet, auto-select the first active role
      // (or honor the env override during dev).
      const stored = entrepreneurStore.get();
      const envDefault = import.meta.env.VITE_DEFAULT_ENTREPRENEUR_ID as string | undefined;

      // Validate stored ID against current roles (may be stale after DB reset)
      const storedIsValid = stored && me.roles.some((r) => r.entrepreneur === stored && r.is_active);
      const candidate =
        (storedIsValid ? stored : null) ||
        envDefault ||
        me.roles.find((r) => r.is_active)?.entrepreneur ||
        null;

      if (candidate && candidate !== stored) {
        entrepreneurStore.set(candidate);
        setActiveEntrepreneurIdState(candidate);
      } else if (candidate) {
        setActiveEntrepreneurIdState(candidate);
      }
      return me;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        tokenStore.clear();
        entrepreneurStore.clear();
        setUser(null);
        setRoles([]);
        setActiveEntrepreneurIdState(null);
      }
      return null;
    }
  }, []);

  // Boot: if we have a token, hydrate user + roles.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
        if (!cancelled) setLoading(false);
        return;
      }
      await fetchMe();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const tokens = await api.auth.login(email, password);
        tokenStore.set(tokens);
        await fetchMe();
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error("Login failed") };
      }
    },
    [fetchMe],
  );

  const signOut = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      try { await api.auth.logout(refresh); } catch { /* swallow */ }
    }
    tokenStore.clear();
    entrepreneurStore.clear();
    setUser(null);
    setRoles([]);
    setActiveEntrepreneurIdState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles,
      activeEntrepreneurId,
      loading,
      isAuthenticated: Boolean(user && activeEntrepreneurId),
      signIn,
      signOut,
      setActiveEntrepreneur,
      refreshMe: async () => {
        await fetchMe();
      },
    }),
    [user, roles, activeEntrepreneurId, loading, signIn, signOut, setActiveEntrepreneur, fetchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
