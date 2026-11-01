import { describe, it, expect, beforeEach } from 'vitest';
import { dryRunRule } from '@/engine/dryRun';
import { useStore } from '@/store';
import type { Rule, Device, LightDevice, ThermostatDevice } from '@/types';
import type { StateSnapshot } from '@/engine/automation';

describe('Dry-Run Simulator', () => {
  let light: LightDevice;
  let therm: ThermostatDevice;
  let offlineDev: Device;
  let mockSnapshot: StateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();

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
});
