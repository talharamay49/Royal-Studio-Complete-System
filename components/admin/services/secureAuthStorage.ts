import type { User } from '../types';

export const AUTHORIZED_ADMIN_EMAIL = 'admin@royalstudio.online';

const DB_NAME = 'royal_studio_secure_auth_db';
const DB_VERSION = 1;
const STORE_NAME = 'auth_vault';
const VAULT_RECORD_KEY = 'active_admin_session';
const SESSION_COOKIE_NAME = 'royal_studio_session';
const SESSION_MIRROR_KEY = '__rs_secure_session_v1';

interface StoredSessionEnvelope {
  token: string;
  user: User | null;
  signature: string;
  issuedAt: number;
  expiresAt: number;
}

// Memory cache hydrated synchronously from cookie/session mirror and asynchronously from IndexedDB
let memoryTokenCache: string | null = null;
let memoryUserCache: User | null = null;

function computeSimpleSignature(token: string, email: string): string {
  const payload = `${token}::${email.toLowerCase()}::royal_studio_v1`;
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
  }
  return `sig_${(hash >>> 0).toString(16)}`;
}

function encodeEnvelope(envelope: StoredSessionEnvelope): string {
  try {
    const json = JSON.stringify(envelope);
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(encodeURIComponent(json));
    }
    return json;
  } catch {
    return '';
  }
}

function decodeEnvelope(encoded: string): StoredSessionEnvelope | null {
  try {
    if (!encoded) return null;
    const json =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? decodeURIComponent(window.atob(encoded))
        : encoded;
    const parsed = JSON.parse(json) as StoredSessionEnvelope;
    if (!parsed || !parsed.token || parsed.expiresAt < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readCookieToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const part of cookies) {
      const [rawKey, ...rest] = part.split('=');
      if (rawKey === SESSION_COOKIE_NAME) {
        const val = decodeURIComponent(rest.join('='));
        if (val && val.startsWith('token-')) {
          return val;
        }
      }
    }
  } catch {
    // Ignore cookie read errors in restricted environments
  }
  return null;
}

function writeCookieToken(token: string, maxAgeSeconds = 30 * 24 * 60 * 60): void {
  if (typeof document === 'undefined') return;
  try {
    const secureFlag =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '; Secure; SameSite=None'
        : '; SameSite=Lax';
    document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}${secureFlag}`;
  } catch {
    // Ignore cookie write errors
  }
}

function clearCookieToken(): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Secure; SameSite=None`;
  } catch {
    // Ignore
  }
}

function openAuthVaultDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeVaultRecord(envelope: StoredSessionEnvelope): Promise<void> {
  const db = await openAuthVaultDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(encodeEnvelope(envelope), VAULT_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function readVaultRecord(): Promise<StoredSessionEnvelope | null> {
  const db = await openAuthVaultDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(VAULT_RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        if (typeof req.result === 'string') {
          resolve(decodeEnvelope(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function deleteVaultRecord(): Promise<void> {
  const db = await openAuthVaultDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(VAULT_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/**
 * Synchronous token accessor for API headers.
 * Checks memory cache -> sessionStorage encrypted mirror -> first-party cookie.
 */
export function getSecureToken(): string | null {
  if (memoryTokenCache) return memoryTokenCache;
  if (typeof window === 'undefined') return null;

  try {
    const rawSession = window.sessionStorage.getItem(SESSION_MIRROR_KEY);
    if (rawSession) {
      const env = decodeEnvelope(rawSession);
      if (env && env.token) {
        memoryTokenCache = env.token;
        if (env.user) memoryUserCache = env.user;
        return env.token;
      }
    }
  } catch {
    // Ignore sessionStorage restrictions
  }

  const cookieToken = readCookieToken();
  if (cookieToken) {
    memoryTokenCache = cookieToken;
    return cookieToken;
  }

  return null;
}

/**
 * Asynchronous session hydration on reload.
 * Restores token & user from IndexedDB vault, sessionStorage mirror, or first-party cookie.
 */
export async function hydrateSecureSession(): Promise<{ token: string | null; user: User | null }> {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  // 1. Check IndexedDB secure vault first (persists reliably across reloads & tabs)
  const vaultEnvelope = await readVaultRecord();
  if (vaultEnvelope && vaultEnvelope.token) {
    const expectedSig = computeSimpleSignature(
      vaultEnvelope.token,
      vaultEnvelope.user?.email || AUTHORIZED_ADMIN_EMAIL
    );
    if (vaultEnvelope.signature === expectedSig) {
      memoryTokenCache = vaultEnvelope.token;
      memoryUserCache = vaultEnvelope.user;
      writeCookieToken(vaultEnvelope.token);
      try {
        window.sessionStorage.setItem(SESSION_MIRROR_KEY, encodeEnvelope(vaultEnvelope));
      } catch {
        // Ignore
      }
      return { token: vaultEnvelope.token, user: vaultEnvelope.user };
    }
  }

  // 2. Fallback to sessionStorage mirror
  try {
    const rawMirror = window.sessionStorage.getItem(SESSION_MIRROR_KEY);
    if (rawMirror) {
      const env = decodeEnvelope(rawMirror);
      if (env && env.token) {
        memoryTokenCache = env.token;
        memoryUserCache = env.user;
        writeCookieToken(env.token);
        await writeVaultRecord(env);
        return { token: env.token, user: env.user };
      }
    }
  } catch {
    // Ignore
  }

  // 3. Fallback to first-party cookie
  const cookieToken = readCookieToken();
  if (cookieToken) {
    memoryTokenCache = cookieToken;
    return { token: cookieToken, user: memoryUserCache };
  }

  return { token: null, user: null };
}

/**
 * Persist authenticated session to IndexedDB Vault + SameSite Cookie + Session Mirror.
 */
export async function saveSecureSession(token: string, user: User | null = null): Promise<void> {
  memoryTokenCache = token;
  if (user) {
    memoryUserCache = user;
  }

  const email = user?.email || AUTHORIZED_ADMIN_EMAIL;
  const envelope: StoredSessionEnvelope = {
    token,
    user: user || memoryUserCache,
    signature: computeSimpleSignature(token, email),
    issuedAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };

  writeCookieToken(token);

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SESSION_MIRROR_KEY, encodeEnvelope(envelope));
    } catch {
      // Ignore
    }
  }

  await writeVaultRecord(envelope);
}

/**
 * Clear session across IndexedDB Vault, SameSite Cookie, and Session Mirror.
 */
export async function clearSecureSession(): Promise<void> {
  memoryTokenCache = null;
  memoryUserCache = null;
  clearCookieToken();

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(SESSION_MIRROR_KEY);
    } catch {
      // Ignore
    }
  }

  await deleteVaultRecord();
}

/**
 * Validates that the login email is a valid email address (Admin or Staff)
 * and that the password meets minimum length requirements before dispatching.
 */
export async function verifyAdminCredentialPolicy(
  rawEmail: string,
  rawPassword: string
): Promise<{ valid: boolean; normalizedEmail: string; error?: string }> {
  const normalizedEmail = (rawEmail || '').trim().toLowerCase();
  const password = (rawPassword || '').trim();

  if (!normalizedEmail || !password) {
    return {
      valid: false,
      normalizedEmail,
      error: 'Email address and password are required.',
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      valid: false,
      normalizedEmail,
      error: 'Please enter a valid studio email address.',
    };
  }

  if (password.length < 4) {
    return {
      valid: false,
      normalizedEmail,
      error: 'Password must be at least 4 characters long.',
    };
  }

  return { valid: true, normalizedEmail };
}
