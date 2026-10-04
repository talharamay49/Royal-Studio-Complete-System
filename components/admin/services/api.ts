import {
  getSecureToken,
  saveSecureSession,
  clearSecureSession,
} from './secureAuthStorage';

export function getStoredToken(): string | null {
  return getSecureToken();
}

export function setStoredToken(token: string): void {
  void saveSecureSession(token);
}

export function removeStoredToken(): void {
  void clearSecureSession();
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSecureToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const normalizedUrl = endpoint.startsWith('/api/')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(normalizedUrl, {
    ...options,
    credentials: 'include',
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (!normalizedUrl.includes('/auth/login')) {
      await clearSecureSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    throw new Error(data.error || 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}
