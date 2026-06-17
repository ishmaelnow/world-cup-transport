import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '../lib/auth';
import { getCurrentUser } from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STARTUP_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      console.log('[auth-context] refreshUser result', currentUser);
      setUser(currentUser);
      setAuthError(null);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setAuthError(error instanceof Error ? error.message : 'Unable to load authentication state.');
    }
  };

  useEffect(() => {
    withTimeout(
      refreshUser(),
      AUTH_STARTUP_TIMEOUT_MS,
      'Authentication service did not respond. Check the site connection and try again.'
    )
      .catch((error) => {
        console.error('[auth-context] initial auth load failed:', error);
        setUser(null);
        setAuthError(error instanceof Error ? error.message : 'Unable to load authentication state.');
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth-context] auth state change', {
        event,
        userId: session?.user.id,
        email: session?.user.email,
        jwtRole: session?.user.app_metadata?.role,
        appMetadata: session?.user.app_metadata,
      });
      (async () => {
        await refreshUser();
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
