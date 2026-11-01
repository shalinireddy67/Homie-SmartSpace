import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dryRunRule } from '@/engine/dryRun';
import * as commands from '@/engine/commands';
import * as automation from '@/engine/automation';
import { useStore } from '@/store';
import type { Rule, Device, LightDevice, ThermostatDevice } from '@/types';
import type { StateSnapshot } from '@/engine/automation';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

describe('Dry-Run Simulator', () => {
  let light: LightDevice;
  let therm: ThermostatDevice;
  let offlineDev: Device;
  let mockSnapshot: StateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
    vi.restoreAllMocks();

    const storeDevices = useStore.getState().devices;
    const storeRooms = useStore.getState().rooms;

    light = storeDevices.find((d): d is LightDevice => d.type === 'light' && d.online)!;
    therm = storeDevices.find((d): d is ThermostatDevice => d.type === 'thermostat' && d.online)!;
    offlineDev = storeDevices.find((d) => !d.online)!;

    mockSnapshot = {
      devices: storeDevices,
      rooms: storeRooms,
      currentTime: 1730476800000,
      totalWatts: 500,
    };
  });

  it('runs isolated evaluation with identical condition logic to live engine', () => {
    const rule: Rule = {
      id: 'dry-rule-1',
      name: 'Dry Run Climate Rule',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: 'c-1',
            deviceId: therm.id,
            field: 'current',
            operator: '>',
            value: therm.current - 1,
          },
        ],
      },
      actions: [
        {
          id: 'act-1',
          deviceId: light.id,
          field: 'brightness',
          value: 75,
        },
      ],
      cooldownMinutes: 10,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    const report = dryRunRule(rule, mockSnapshot);

    expect(report.simulation).toBe(true);
    expect(report.overall).toBe(true);
    expect(report.conditionResults).toHaveLength(1);
    expect(report.conditionResults[0]?.passed).toBe(true);
    expect(report.proposedActions).toHaveLength(1);
    expect(report.proposedActions[0]?.willRun).toBe(true);
    expect(report.proposedActions[0]?.action.value).toBe(75);
    expect(report.proposedActions[0]?.targetDevice?.id).toBe(light.id);
  });

  it('reports willRun: false when conditions fail', () => {
    const rule: Rule = {
      id: 'dry-rule-fail',
      name: 'Failing Rule',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: 'c-fail',
            deviceId: therm.id,
            field: 'current',
            operator: '>',
            value: 999, // Impossible condition
          },
        ],
      },
      actions: [
        {
          id: 'act-1',
          deviceId: light.id,
          field: 'brightness',
          value: 75,
        },
      ],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    const report = dryRunRule(rule, mockSnapshot);
    expect(report.overall).toBe(false);
    expect(report.proposedActions[0]?.willRun).toBe(false);
    expect(report.proposedActions[0]?.reason).toContain('not satisfied');
  });

  it('reports willRun: false when target device is offline', () => {
    const rule: Rule = {
      id: 'dry-rule-offline-target',
      name: 'Offline Target Rule',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [
        {
          id: 'act-offline',
          deviceId: offlineDev.id,
          field: 'active',
          value: true,
        },
      ],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    const report = dryRunRule(rule, mockSnapshot);
    expect(report.overall).toBe(true);
    expect(report.proposedActions[0]?.willRun).toBe(false);
    expect(report.proposedActions[0]?.reason).toContain('offline');
  });

  it('strictly causes zero mutations, side-effects, executions, or events in the store', () => {
    const initialDevices = [...useStore.getState().devices];
    const initialEvents = [...useStore.getState().events];
    const initialExecutions = [...useStore.getState().executionHistory];
    const initialNotifications = [...useStore.getState().notifications];

    const rule: Rule = {
      id: 'dry-rule-pure',
      name: 'Pure Verification Rule',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [{ id: 'act-1', deviceId: light.id, field: 'brightness', value: 10 }],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    // Execute dry run
    dryRunRule(rule, mockSnapshot);

    // Verify store is untouched
    expect(useStore.getState().devices).toEqual(initialDevices);
    expect(useStore.getState().events).toEqual(initialEvents);
    expect(useStore.getState().executionHistory).toEqual(initialExecutions);
    expect(useStore.getState().notifications).toEqual(initialNotifications);
  });

  it('deep-freezes the rule and snapshot and executes cleanly without mutation', () => {
    const rule: Rule = {
      id: 'dry-rule-frozen',
      name: 'Frozen Rule',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: 'c-frozen',
            deviceId: therm.id,
            field: 'current',
            operator: '>',
            value: 15,
          },
        ],
      },
      actions: [
        {
          id: 'act-frozen',
          deviceId: light.id,
          field: 'brightness',
          value: 80,
        },
      ],
      cooldownMinutes: 5,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    // Deep freeze both inputs
    deepFreeze(rule);
    deepFreeze(mockSnapshot);

    expect(Object.isFrozen(rule)).toBe(true);
    expect(Object.isFrozen(mockSnapshot)).toBe(true);

    // Dry run must execute without throwing any Mutation / Frozen errors
    const report = dryRunRule(rule, mockSnapshot);
    expect(report).toBeDefined();
    expect(report.overall).toBe(true);
    expect(report.proposedActions[0]?.willRun).toBe(true);
  });

  it('spies dispatchCommand and asserts zero calls during dry run', () => {
    const dispatchSpy = vi.spyOn(commands, 'dispatchCommand');

    const rule: Rule = {
      id: 'dry-rule-spy-dispatch',
      name: 'No Dispatch Rule',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [{ id: 'act-1', deviceId: light.id, field: 'brightness', value: 90 }],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    dryRunRule(rule, mockSnapshot);

    expect(dispatchSpy).toHaveBeenCalledTimes(0);
  });

  it('asserts store state deep-equal before and after dry run', () => {
    const stateBefore = JSON.parse(JSON.stringify(useStore.getState()));

    const rule: Rule = {
      id: 'dry-rule-state-eq',
      name: 'Deep Equal Store Rule',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [
        { id: 'act-1', deviceId: light.id, field: 'brightness', value: 100 },
        { id: 'act-2', deviceId: therm.id, field: 'target', value: 24 },
      ],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    dryRunRule(rule, mockSnapshot);

    const stateAfter = JSON.parse(JSON.stringify(useStore.getState()));
    expect(stateAfter).toEqual(stateBefore);
  });

  it('proves dry run and live use the same evaluateRule function', () => {
    const evalSpy = vi.spyOn(automation, 'evaluateRule');

    const rule: Rule = {
      id: 'dry-rule-shared-eval',
      name: 'Shared Eval Rule',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    dryRunRule(rule, mockSnapshot);

    expect(evalSpy).toHaveBeenCalledTimes(1);
    expect(evalSpy).toHaveBeenCalledWith(rule, mockSnapshot);
  });
});
