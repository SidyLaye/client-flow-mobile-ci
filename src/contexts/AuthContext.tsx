import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerPushToken, unregisterPushToken } from '@/lib/push';

export type ClientAccount = {
  id: string;
  client_id: string;
  user_id: string;
  access_status: 'active' | 'suspended' | 'disabled' | string;
  can_access_mobile: boolean | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  clientAccount: ClientAccount | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshClientAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [clientAccount, setClientAccount] = useState<ClientAccount | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadClientAccount(userId: string) {
    const { data, error } = await supabase
      .from('client_accounts')
      .select('id, client_id, user_id, access_status, can_access_mobile')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[auth] load client_account failed', error.message);
      setClientAccount(null);
      return;
    }
    setClientAccount(data as ClientAccount | null);
  }

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadClientAccount(data.session.user.id);
        registerPushToken(data.session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, next) => {
      setSession(next);
      if (next?.user) {
        await loadClientAccount(next.user.id);
        if (event === 'SIGNED_IN') registerPushToken(next.user.id);
      } else {
        setClientAccount(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      clientAccount,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        const uid = session?.user?.id;
        if (uid) await unregisterPushToken(uid);
        await supabase.auth.signOut();
      },
      refreshClientAccount: async () => {
        if (session?.user) await loadClientAccount(session.user.id);
      },
    }),
    [loading, session, clientAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
