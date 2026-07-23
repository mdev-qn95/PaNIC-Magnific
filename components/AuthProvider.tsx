'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: AuthUser | null;
  /** Chỉ admin mới được ghi dữ liệu xuống DB. */
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  loading: true,
  refresh: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data } = supabase?.auth.onAuthStateChange(() => {
      refresh();
    }) ?? { data: null };
    return () => data?.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({ user, isAdmin: user?.role === 'admin', loading, refresh }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
