import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadPersistedState,
  savePersistedState,
  debouncedSave,
  flushSave,
  STORAGE_KEY,
  THEME_STORAGE_KEY,
  type PersistedStateV1,
} from '@/store/storage';
import { validateAndSanitizeState } from '@/store/storage/validation';
import { generateSeedData } from '@/utils/seedData';

describe('Storage & Persistence Layer', () => {
  const seed = generateSeedData(1234, 1730476800000);

  const validSampleState: PersistedStateV1 = {
    version: 1,
    devices: seed.devices,
    rules: seed.rules,
    schedules: seed.schedules,
    notifications: [],
    simulation: {
      speed: 2,
      seed: 1234,
      failNextCommand: true,
      failureProbability: 0.1,
    },
    theme: 'dark',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs clean round trip save and load', () => {
    savePersistedState(validSampleState);

    const loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded?.theme).toBe('dark');
    expect(loaded?.devices?.length).toBe(seed.devices.length);
    expect(loaded?.simulation?.speed).toBe(2);
    expect(loaded?.simulation?.failNextCommand).toBe(true);

    // Also verify theme key was written
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('safely handles corrupted JSON without throwing and falls back to null', () => {
    localStorage.setItem(STORAGE_KEY, '{ invalid JSON : corrupted %#!');

    expect(() => {
      const result = loadPersistedState();
      expect(result).toBeNull();
    }).not.toThrow();
  });

  it('migrates legacy state (version 0) to version 1', () => {
    const legacyState = {
      version: 0,
      devices: [
        {
          id: 'dev-old-light',
          name: 'Old Light',
          roomId: 'room-living',
          type: 'light',
          online: true,
          on: true,
          brightness: 50,
          color: '#ffffff',
          updatedAt: 1000,
          // powerWatts is missing in legacy v0
        },
      ],
      simulation: {
        speedMultiplier: 5, // Old property name in v0
        seed: 9999,
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded?.devices?.[0]?.powerWatts).toBe(40); // Backfilled powerWatts for on light
    expect(loaded?.simulation?.speed).toBe(5); // Migrated speedMultiplier to speed
  });

  it('sanitizes missing fields and retains valid subsets', () => {
    const partialState = {
      version: 1,
      // devices, rules, schedules are omitted
      simulation: {
        speed: 10,
        seed: 777,
      },
      theme: 'light',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(partialState));

    const loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded?.theme).toBe('light');
    expect(loaded?.simulation?.speed).toBe(10);
    expect(loaded?.devices).toBeUndefined();
  });

  it('filters out invalid field values and retains healthy items', () => {
    const corruptedItemsState = {
      version: 1,
      devices: [
        {
          id: 'dev-valid',
          name: 'Valid Light',
          roomId: 'room-living',
          type: 'light',
          online: true,
          on: true,
          brightness: 50,
          color: '#ffffff',
          updatedAt: 1000,
          powerWatts: 40,
        },
        {
          id: 'dev-broken',
          // missing name, roomId, powerWatts
          type: 'unknown_type',
        },
      ],
      rules: [
        { id: 'broken-rule' }, // missing conditions & actions
      ],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedItemsState));

    const loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded?.devices?.length).toBe(1);
    expect(loaded?.devices?.[0]?.id).toBe('dev-valid');
    expect(loaded?.rules?.length).toBe(0); // Corrupt rule filtered out
  });

  it('confirms persisted state contains no events and no telemetry', () => {
    savePersistedState(validSampleState);

    const rawStored = localStorage.getItem(STORAGE_KEY);
    expect(rawStored).toBeDefined();
    if (!rawStored) return;

    const parsed = JSON.parse(rawStored);
    expect(parsed.events).toBeUndefined();
    expect(parsed.liveTelemetry).toBeUndefined();
    expect(parsed.initialTelemetry).toBeUndefined();
    expect(parsed.telemetry).toBeUndefined();

    // Raw JSON string confirmation
    expect(rawStored).not.toContain('"events"');
    expect(rawStored).not.toContain('"liveTelemetry"');
    expect(rawStored).not.toContain('"initialTelemetry"');
    expect(rawStored).not.toContain('"telemetry"');
  });

  it('debounces rapid writes and executes only once (fake timers)', () => {
    vi.useFakeTimers();

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    // Trigger multiple rapid debounced saves
    debouncedSave(validSampleState, 500);
    debouncedSave({ ...validSampleState, theme: 'light' }, 500);
    debouncedSave({ ...validSampleState, theme: 'dark' }, 500);

    // Has not saved yet
    expect(setItemSpy).not.toHaveBeenCalled();

    // Advance time past debounce interval
    vi.advanceTimersByTime(500);

    // Only 1 save executed (writes STORAGE_KEY and THEME_STORAGE_KEY)
    expect(setItemSpy).toHaveBeenCalledTimes(2);

    const saved = loadPersistedState();
    expect(saved?.theme).toBe('dark');
  });

  it('synchronously flushes pending writes on flushSave()', () => {
    vi.useFakeTimers();

    debouncedSave({ ...validSampleState, theme: 'dark' }, 1000);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

    flushSave();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  describe('Legacy Storage Key Migration (NESTORA & HOMIE to HOMIE_SMARTSPACE)', () => {
    it('migrates NESTORA_V1_STATE once and removes old key', () => {
      localStorage.setItem('NESTORA_V1_STATE', JSON.stringify(validSampleState));
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      const loaded = loadPersistedState();
      expect(loaded).toBeDefined();
      expect(loaded?.theme).toBe('dark');
      // Saved under new key
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      // Old key removed
      expect(localStorage.getItem('NESTORA_V1_STATE')).toBeNull();
    });

    it('migrates HOMIE_V1_STATE once and removes old key', () => {
      localStorage.setItem('HOMIE_V1_STATE', JSON.stringify(validSampleState));
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      const loaded = loadPersistedState();
      expect(loaded).toBeDefined();
      expect(loaded?.theme).toBe('dark');
      // Saved under new key
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      // Old key removed
      expect(localStorage.getItem('HOMIE_V1_STATE')).toBeNull();
    });

    it('falls back to defaults without throwing when legacy NESTORA_V1_STATE has corrupted JSON', () => {
      localStorage.setItem('NESTORA_V1_STATE', '{ corrupted json syntax %#!');

      expect(() => {
        const loaded = loadPersistedState();
        expect(loaded).toBeNull();
      }).not.toThrow();
    });

    it('falls back to defaults without throwing when legacy HOMIE_V1_STATE has corrupted JSON', () => {
      localStorage.setItem('HOMIE_V1_STATE', '{ broken json syntax :::');

      expect(() => {
        const loaded = loadPersistedState();
        expect(loaded).toBeNull();
      }).not.toThrow();
    });

    it('migrates legacy nestora_theme key and removes it', () => {
      localStorage.setItem('nestora_theme', 'dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

      loadPersistedState();
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(localStorage.getItem('nestora_theme')).toBeNull();
    });

    it('migrates legacy homie_theme key and removes it', () => {
      localStorage.setItem('homie_theme', 'light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

      loadPersistedState();
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
      expect(localStorage.getItem('homie_theme')).toBeNull();
    });

    it('second load does not migrate again', () => {
      localStorage.setItem('NESTORA_V1_STATE', JSON.stringify(validSampleState));
      const firstLoad = loadPersistedState();
      expect(firstLoad).toBeDefined();
      expect(localStorage.getItem('NESTORA_V1_STATE')).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const secondLoad = loadPersistedState();
      expect(secondLoad).toBeDefined();
      // On second load, new key was already read directly, no savePersistedState called for migration
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('validates and imports an exported settings file originating from an old name', () => {
      const exportedFromOld = {
        version: 1,
        devices: seed.devices,
        rules: seed.rules,
        schedules: seed.schedules,
        simulation: {
          speed: 5,
          seed: 4321,
          failNextCommand: false,
          failureProbability: 0.05,
        },
        theme: 'dark',
      };

      // Simulates importing JSON from file named 'nestora-settings-2026-11-01.json' or 'homie-settings.json'
      const sanitized = validateAndSanitizeState(exportedFromOld);
      expect(sanitized).toBeDefined();
      expect(sanitized?.simulation?.speed).toBe(5);
      expect(sanitized?.simulation?.seed).toBe(4321);
      expect(sanitized?.devices?.length).toBe(seed.devices.length);
    });
  });
});

