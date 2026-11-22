import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSession,
  setSession,
  clearSession,
  hasActiveSession,
  SESSION_STORAGE_KEY,
  __testResetSession,
} from '@/services/session';

describe('Session Service', () => {
  beforeEach(() => {
    __testResetSession(false);
    clearSession();
    localStorage.clear();
  });

  it('returns null and hasActiveSession() is false when no session exists', () => {
    expect(getSession()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });

  it('successfully sets and retrieves a demo session', () => {
    const started = Date.now();
    const success = setSession({ mode: 'demo', startedAt: started });

    expect(success).toBe(true);
    expect(hasActiveSession()).toBe(true);

    const session = getSession();
    expect(session).not.toBeNull();
    expect(session?.mode).toBe('demo');
    expect(session?.startedAt).toBe(started);
  });

  it('clears session from both storage and memory', () => {
    setSession({ mode: 'demo', startedAt: Date.now() });
    expect(hasActiveSession()).toBe(true);

    clearSession();
    expect(getSession()).toBeNull();
    expect(hasActiveSession()).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('safely handles corrupted JSON in localStorage by returning null without throwing', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{ invalid_json: ');
    expect(getSession()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });

  it('safely handles invalid session structure by returning null', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ mode: 'invalid_mode' }));
    expect(getSession()).toBeNull();
  });

  it('falls back to in-memory session when localStorage is unavailable', () => {
    __testResetSession(true);

    const now = Date.now();
    setSession({ mode: 'demo', startedAt: now });

    expect(hasActiveSession()).toBe(true);
    const session = getSession();
    expect(session?.mode).toBe('demo');
    expect(session?.startedAt).toBe(now);

    clearSession();
    expect(getSession()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });
});
