import { APP_STORAGE_PREFIX } from '@/constants/branding';

export const SESSION_STORAGE_KEY = `${APP_STORAGE_PREFIX}_SESSION`;

export type SessionMode = 'demo' | 'household';

export interface DemoSession {
  mode: 'demo';
  startedAt: number;
}

export interface HouseholdSession {
  mode: 'household';
  startedAt: number;
  householdId?: string;
  userEmail?: string;
}

export type UserSession = DemoSession | HouseholdSession;

// In-memory fallback if localStorage is unavailable or restricted
let inMemorySession: UserSession | null = null;
let forceMemoryOnly = false;

function getStorage(): Storage | null {
  if (forceMemoryOnly) return null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const testKey = '__session_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSession(): UserSession | null {
  const storage = getStorage();
  if (!storage) {
    return inMemorySession;
  }
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed.mode === 'demo' || parsed.mode === 'household') &&
      typeof parsed.startedAt === 'number'
    ) {
      return parsed as UserSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(session: UserSession): boolean {
  inMemorySession = session;
  const storage = getStorage();
  if (!storage) {
    return true;
  }
  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    // If quota exceeded or storage blocked, retain in memory
    return true;
  }
}

export function clearSession(): void {
  inMemorySession = null;
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // safe fallback
    }
  }
}

export function hasActiveSession(): boolean {
  return getSession() !== null;
}

export function startDemoSession(): DemoSession {
  const session: DemoSession = {
    mode: 'demo',
    startedAt: Date.now(),
  };
  setSession(session);
  return session;
}

/** Testing helper to reset in-memory state or toggle memory-only mode */
export function __testResetSession(memoryOnly = false): void {
  inMemorySession = null;
  forceMemoryOnly = memoryOnly;
}
