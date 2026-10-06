import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { User } from '../types';
import { apiRequest } from '../services/api';
import {
  hydrateSecureSession,
  saveSecureSession,
  clearSecureSession,
  verifyAdminCredentialPolicy,
} from '../services/secureAuthStorage';

export type IdleTimeoutOptionMinutes = 5 | 15 | 30 | 60;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isClient: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: (reason?: 'manual' | 'inactivity') => Promise<void>;
  idleRemainingSeconds: number;
  idleTimeoutMinutes: IdleTimeoutOptionMinutes;
  setIdleTimeoutMinutes: (mins: IdleTimeoutOptionMinutes) => void;
  showIdleWarning: boolean;
  extendSession: () => void;
  autoLogoutReason: string | null;
  clearAutoLogoutReason: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_IDLE_MINUTES: IdleTimeoutOptionMinutes = 15;
const WARNING_THRESHOLD_SECONDS = 60;
const STORAGE_TIMEOUT_KEY = 'royal_studio_idle_timeout_mins';
const STORAGE_LAST_ACTIVITY_KEY = 'royal_studio_last_activity_ts';
const STORAGE_LOGOUT_REASON_KEY = 'royal_studio_auto_logout_reason';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [idleTimeoutMinutes, setIdleTimeoutMinutesState] = useState<IdleTimeoutOptionMinutes>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(window.localStorage.getItem(STORAGE_TIMEOUT_KEY));
      if (saved === 5 || saved === 15 || saved === 30 || saved === 60) {
        return saved;
      }
    }
    return DEFAULT_IDLE_MINUTES;
  });

  const [idleRemainingSeconds, setIdleRemainingSeconds] = useState<number>(
    DEFAULT_IDLE_MINUTES * 60
  );
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);
  const [autoLogoutReason, setAutoLogoutReason] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(STORAGE_LOGOUT_REASON_KEY);
    }
    return null;
  });

  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  const setIdleTimeoutMinutes = useCallback((mins: IdleTimeoutOptionMinutes) => {
    setIdleTimeoutMinutesState(mins);
    const now = Date.now();
    lastActivityRef.current = now;
    setIdleRemainingSeconds(mins * 60);
    setShowIdleWarning(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_TIMEOUT_KEY, String(mins));
        window.localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(now));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const clearAutoLogoutReason = useCallback(() => {
    setAutoLogoutReason(null);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(STORAGE_LOGOUT_REASON_KEY);
      } catch {
        // Ignore
      }
    }
  }, []);

  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setIdleRemainingSeconds(idleTimeoutMinutes * 60);
    setShowIdleWarning(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(now));
      } catch {
        // Ignore
      }
    }
  }, [idleTimeoutMinutes]);

  const logout = useCallback(async (reason: 'manual' | 'inactivity' = 'manual') => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowIdleWarning(false);

    if (reason === 'inactivity') {
      const msg =
        'Your session was automatically signed out due to inactivity to protect unauthorized access.';
      setAutoLogoutReason(msg);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(STORAGE_LOGOUT_REASON_KEY, msg);
        } catch {
          // Ignore
        }
      }
    } else {
      clearAutoLogoutReason();
    }

    try {
      await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      await clearSecureSession();
      setUser(null);
      isLoggingOutRef.current = false;
    }
  }, [clearAutoLogoutReason]);

  // Hydrate user session from secure IndexedDB / SameSite cookie vault on mount
  const checkAuth = useCallback(async () => {
    try {
      const hydrated = await hydrateSecureSession();

      if (hydrated.user && hydrated.user.status !== 'DISABLED') {
        setUser(hydrated.user);
      }

      if (!hydrated.token) {
        try {
          const cookieSession = await apiRequest<{ user: User }>('/api/auth/me');
          if (cookieSession?.user && cookieSession.user.status !== 'DISABLED') {
            setUser(cookieSession.user);
            lastActivityRef.current = Date.now();
            setIsLoading(false);
            return;
          }
        } catch {
          // Not authenticated
        }
        setUser(null);
        setIsLoading(false);
        return;
      }

      const data = await apiRequest<{ user: User }>('/api/auth/me');
      if (data?.user && data.user.status !== 'DISABLED') {
        await saveSecureSession(hydrated.token, data.user);
        setUser(data.user);
        lastActivityRef.current = Date.now();
      } else {
        await clearSecureSession();
        setUser(null);
      }
    } catch {
      await clearSecureSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      void clearSecureSession();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  // Activity listeners and countdown for inactivity auto-logout
  useEffect(() => {
    if (!user) {
      setShowIdleWarning(false);
      return;
    }

    const timeoutMs = idleTimeoutMinutes * 60 * 1000;
    let lastThrottleUpdate = 0;

    const handleUserActivity = () => {
      // If the warning modal is already visible, require explicit "Stay Signed In" button click
      // or reset if more than 60s remaining
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remainingSec = Math.floor((timeoutMs - elapsed) / 1000);
      if (remainingSec <= WARNING_THRESHOLD_SECONDS) {
        return;
      }

      if (now - lastThrottleUpdate > 1000) {
        lastThrottleUpdate = now;
        lastActivityRef.current = now;
        try {
          window.localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(now));
        } catch {
          // Ignore
        }
      }
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_LAST_ACTIVITY_KEY && e.newValue) {
        const syncedTs = Number(e.newValue);
        if (!Number.isNaN(syncedTs) && syncedTs > lastActivityRef.current) {
          lastActivityRef.current = syncedTs;
          setShowIdleWarning(false);
        }
      } else if (e.key === STORAGE_TIMEOUT_KEY && e.newValue) {
        const syncedMins = Number(e.newValue) as IdleTimeoutOptionMinutes;
        if (syncedMins === 5 || syncedMins === 15 || syncedMins === 30 || syncedMins === 60) {
          setIdleTimeoutMinutesState(syncedMins);
        }
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'click',
      'scroll',
      'touchstart',
      'pointerdown',
    ];

    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );
    window.addEventListener('storage', handleStorageSync);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.floor((timeoutMs - elapsed) / 1000));
      setIdleRemainingSeconds(remaining);

      if (remaining <= 0) {
        void logout('inactivity');
      } else if (remaining <= WARNING_THRESHOLD_SECONDS) {
        setShowIdleWarning(true);
      } else {
        setShowIdleWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener('storage', handleStorageSync);
      clearInterval(interval);
    };
  }, [user, idleTimeoutMinutes, logout]);

  const login = async (email: string, password: string) => {
    const policyCheck = await verifyAdminCredentialPolicy(email, password);
    if (!policyCheck.valid) {
      throw new Error(
        policyCheck.error || 'Please enter a valid studio email and password.'
      );
    }

    setIsLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: policyCheck.normalizedEmail,
          password: password.trim(),
        }),
      });

      if (!data?.user) {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }

      clearAutoLogoutReason();
      await saveSecureSession(data.token, data.user);
      const now = Date.now();
      lastActivityRef.current = now;
      setIdleRemainingSeconds(idleTimeoutMinutes * 60);
      setShowIdleWarning(false);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(now));
        } catch {
          // Ignore
        }
      }
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const isClient = user?.role === 'CLIENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isStaff,
        isClient,
        login,
        logout,
        idleRemainingSeconds,
        idleTimeoutMinutes,
        setIdleTimeoutMinutes,
        showIdleWarning,
        extendSession,
        autoLogoutReason,
        clearAutoLogoutReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
