import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store';
import type { LightDevice, LivePowerReading, Rule } from '@/types';

describe('Zustand Store Slices & Actions', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
  });

  it('updates device state correctly', () => {
    const { devices, updateDevice } = useStore.getState();
    const light = devices.find((d): d is LightDevice => d.type === 'light');
    expect(light).toBeDefined();
    if (!light) return;

    updateDevice(light.id, { brightness: 99, on: true });

    const updated = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(updated.brightness).toBe(99);
    expect(updated.on).toBe(true);
  });

  it('bounds liveTelemetry array to 300 items (ring buffer behavior)', () => {
    const { appendLiveTelemetry } = useStore.getState();

    // Append 350 readings
    for (let i = 0; i < 350; i++) {
      const reading: LivePowerReading = {
        timestamp: 1000 + i,
        totalWatts: i * 10,
        roomWatts: {},
        deviceWatts: {},
      };
      appendLiveTelemetry(reading);
    }

    const telemetry = useStore.getState().liveTelemetry;
    expect(telemetry.length).toBe(300);
    // Oldest 50 were evicted; first item timestamp should be 1000 + 50 = 1050
    expect(telemetry[0]?.timestamp).toBe(1050);
    expect(telemetry[299]?.timestamp).toBe(1349);
  });

  it('bounds execution history to max 100 items', () => {
    const { addExecution } = useStore.getState();

    for (let i = 0; i < 120; i++) {
      addExecution({
        id: `exec-${i}`,
        ruleId: 'rule-test',
        ruleName: 'Test Rule',
        timestamp: i * 100,
        status: 'success',
        actionsExecuted: [],
      });
    }

    const history = useStore.getState().executionHistory;
    expect(history.length).toBe(100);
    expect(history[0]?.id).toBe('exec-119'); // Most recent at index 0
  });

  it('adds, updates, toggles, and deletes rules', () => {
    const newRule: Rule = {
      id: 'test-rule-1',
      name: 'Test Automation Rule',
      enabled: false,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [],
      cooldownMinutes: 10,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    useStore.getState().addRule(newRule);
    expect(useStore.getState().rules.find((r) => r.id === 'test-rule-1')).toBeDefined();

    useStore.getState().toggleRule('test-rule-1');
    expect(useStore.getState().rules.find((r) => r.id === 'test-rule-1')?.enabled).toBe(true);

    useStore.getState().deleteRule('test-rule-1');
    expect(useStore.getState().rules.find((r) => r.id === 'test-rule-1')).toBeUndefined();
  });

  describe('Rollback Fencing Helpers (Per-Field Versioning)', () => {
    it('allows rollback when sequence matches current field sequence', () => {
      const { nextSequence, canRollback } = useStore.getState();

      const seq1 = nextSequence('dev-1', 'brightness');
      expect(canRollback('dev-1', 'brightness', seq1)).toBe(true);
    });

    it('prevents older sequence from rolling back a field a newer sequence touched', () => {
      const { nextSequence, canRollback } = useStore.getState();

      const seq1 = nextSequence('dev-1', 'brightness');
      const seq2 = nextSequence('dev-1', 'brightness');

      expect(seq2).toBeGreaterThan(seq1);

      // seq1 is older than current field sequence (seq2) -> rollback MUST be blocked!
      expect(canRollback('dev-1', 'brightness', seq1)).toBe(false);
      // seq2 is current -> rollback allowed
      expect(canRollback('dev-1', 'brightness', seq2)).toBe(true);
    });

    it('allows unrelated field to roll back even if another field was modified', () => {
      const { markField, canRollback } = useStore.getState();

      // Step 1: Mark field 'color' at sequence 10
      markField('dev-1', 'color', 10);

      // Step 2: Field 'brightness' has advanced to sequence 101
      markField('dev-1', 'brightness', 101);

      // 'color' remains at sequence 10 (unrelated field was not touched by sequence 101)
      expect(canRollback('dev-1', 'color', 10)).toBe(true);

      // 'brightness' has advanced to 101, so an older sequence 100 CANNOT roll back
      expect(canRollback('dev-1', 'brightness', 100)).toBe(false);
    });
  });
});
