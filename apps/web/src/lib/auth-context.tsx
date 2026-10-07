'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, refreshSession, setSessionExpiredHandler } from './api-client';
import type { User } from './types';

/** `error` means the session could not be checked (network, rate limit, server), not that there is none. */
type Status = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Checks the session again after a `status` of `error`. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const applyUser = useCallback((next: User | null) => {
    setUser(next);
    setStatus(next ? 'authenticated' : 'unauthenticated');
  }, []);

  // On first load the in-memory token is gone, so try to restore the session from the refresh cookie.
  const restore = useCallback(() => {
    refreshSession()
      .then((session) => applyUser(session?.user ?? null))
      .catch(() => setStatus('error'));
  }, [applyUser]);

  const retry = useCallback(() => {
    setStatus('loading');
    restore();
  }, [restore]);

  useEffect(() => {
    setSessionExpiredHandler(() => applyUser(null));
    restore();
    return () => setSessionExpiredHandler(null);
  }, [applyUser, restore]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (email, password) => applyUser(await api.signIn(email, password)),
      signUp: async (email, password) => applyUser(await api.signUp(email, password)),
      signOut: async () => {
        await api.signOut();
        applyUser(null);
      },
      retry,
    }),
    [status, user, applyUser, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
