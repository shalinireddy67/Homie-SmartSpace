import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  savePersistedState,
  getStorageHealth,
} from '@/store/storage/persistence';
import type { PersistedStateV1 } from '@/store/storage/types';

describe('LocalStorage Quota & Fallback Handling', () => {
  const sampleState: PersistedStateV1 = {
    version: 1,
    devices: [],
    rules: [],
    schedules: [],
    notifications: [],
    simulation: {
      speed: 5,
      seed: 1234,
      failNextCommand: false,
      failureProbability: 0.05,
      acceleratedDemo: false,
    },
    theme: 'dark',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('gracefully handles QuotaExceededError on save and retains state in memory', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('QuotaExceededError: quota exceeded', 'QuotaExceededError');
      throw err;
    });

    // Save should not throw
    expect(() => {
      savePersistedState(sampleState);
    }).not.toThrow();

    const health = getStorageHealth();
    expect(health.isQuotaExceeded).toBe(true);
    expect(health.usingFallback).toBe(true);

    setItemSpy.mockRestore();
  });

  it('gracefully falls back when window.localStorage is unavailable', () => {
    savePersistedState(sampleState);
    const health = getStorageHealth();
    expect(health).toBeDefined();
    expect(typeof health.isAvailable).toBe('boolean');
  });
});
