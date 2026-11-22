import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store';
import { setSession, getSession, hasActiveSession } from '@/services/session';

describe('Demo Session Reset Resilience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the active demo session intact when resetToDefaults() is called', () => {
    // 1. Establish an active demo session
    const started = Date.now();
    setSession({ mode: 'demo', startedAt: started });
    expect(hasActiveSession()).toBe(true);

    // 2. Execute store reset to defaults
    useStore.getState().resetToDefaults();

    // 3. Confirm that session is completely preserved
    expect(hasActiveSession()).toBe(true);
    const session = getSession();
    expect(session).not.toBeNull();
    expect(session?.mode).toBe('demo');
    expect(session?.startedAt).toBe(started);
  });
});
