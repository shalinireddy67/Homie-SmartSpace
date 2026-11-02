import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store';
import {
  selectTotalDevices,
  selectOnlineDevicesCount,
  selectOfflineDevicesCount,
  selectActiveAutomationsCount,
  selectCurrentPowerWatts,
  selectTodayEnergyKWh,
  selectIndoorTemperature,
  selectIndoorHumidity,
  selectDeviceDistribution,
  selectRecentEvents,
  selectRecentAnomalies,
  selectRecentAutomations,
  selectLivePowerSeries,
} from '@/store/selectors';
import type { LightDevice, Rule } from '@/types';

describe('Typed Store Selectors (Overview Metrics)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
  });

  it('selects total devices count from known store fixture', () => {
    const state = useStore.getState();
    const total = selectTotalDevices(state);
    expect(total).toBe(state.devices.length);
    expect(total).toBe(14);
  });

  it('selects online and offline counts accurately', () => {
    const state = useStore.getState();
    const online = selectOnlineDevicesCount(state);
    const offline = selectOfflineDevicesCount(state);

    expect(online + offline).toBe(selectTotalDevices(state));
    expect(offline).toBeGreaterThanOrEqual(1); // At least one device starts offline in seed
    expect(online).toBe(13);
    expect(offline).toBe(1);
  });

  it('selects active automations count', () => {
    const state = useStore.getState();
    const active = selectActiveAutomationsCount(state);
    expect(active).toBe(state.rules.filter((r) => r.enabled).length);
    expect(active).toBeGreaterThan(0);
  });

  it('selects current power in Watts and immediately updates when a device is turned off', () => {
    const state = useStore.getState();
    const initialWatts = selectCurrentPowerWatts(state);
    expect(initialWatts).toBeGreaterThan(0);

    const light = state.devices.find((d) => d.id === 'dev-light-living') as LightDevice;
    expect(light.on).toBe(true);
    expect(light.powerWatts).toBeGreaterThan(0);

    // Turn off device
    useStore.getState().updateDevice(light.id, {
      on: false,
      powerWatts: 0,
    });

    const updatedWatts = selectCurrentPowerWatts(useStore.getState());
    expect(updatedWatts).toBe(initialWatts - light.powerWatts);
  });

  it('updates online, offline, and current power watts when a device goes offline', () => {
    const state = useStore.getState();
    const initialOnline = selectOnlineDevicesCount(state);
    const initialOffline = selectOfflineDevicesCount(state);
    const initialWatts = selectCurrentPowerWatts(state);

    const targetDev = state.devices.find((d) => d.id === 'dev-light-kitchen')!;
    const devWatts = targetDev.powerWatts;

    // Transition device to offline
    useStore.getState().updateDevice(targetDev.id, {
      online: false,
      offlineReason: 'Gateway link dropped',
    });

    const updatedState = useStore.getState();
    expect(selectOnlineDevicesCount(updatedState)).toBe(initialOnline - 1);
    expect(selectOfflineDevicesCount(updatedState)).toBe(initialOffline + 1);
    expect(selectCurrentPowerWatts(updatedState)).toBe(initialWatts - devWatts);
  });

  it('selects today energy in kWh integrating since local midnight using aggregateEnergy', () => {
    const state = useStore.getState();
    const todayKWh = selectTodayEnergyKWh(state);

    // Must be a valid non-NaN number
    expect(isNaN(todayKWh)).toBe(false);
    expect(todayKWh).toBeGreaterThanOrEqual(0);
  });

  it('selects indoor temperature averaging across indoor zones', () => {
    const state = useStore.getState();
    const temp = selectIndoorTemperature(state);

    expect(isNaN(temp)).toBe(false);
    expect(temp).toBeGreaterThan(15);
    expect(temp).toBeLessThan(30);
  });

  it('selects indoor humidity averaging across indoor zones', () => {
    const state = useStore.getState();
    const humidity = selectIndoorHumidity(state);

    expect(isNaN(humidity)).toBe(false);
    expect(humidity).toBeGreaterThan(20);
    expect(humidity).toBeLessThan(80);
  });

  it('selects device distribution by type and connection status', () => {
    const state = useStore.getState();
    const dist = selectDeviceDistribution(state);

    expect(dist.total).toBe(14);
    expect(dist.online).toBe(13);
    expect(dist.offline).toBe(1);
    expect(dist.byType.light).toBeGreaterThanOrEqual(2);
    expect(dist.byType.thermostat).toBeGreaterThanOrEqual(2);
    expect(dist.byType.lock).toBeGreaterThanOrEqual(2);
    expect(dist.byType.camera).toBeGreaterThanOrEqual(2);
  });

  it('selects recent events, anomalies, automations, and live series', () => {
    const state = useStore.getState();

    const events = selectRecentEvents(state, 8);
    expect(events.length).toBeLessThanOrEqual(8);

    const anomalies = selectRecentAnomalies(state, 5);
    expect(Array.isArray(anomalies)).toBe(true);

    const automations = selectRecentAutomations(state, 5);
    expect(Array.isArray(automations)).toBe(true);

    const series = selectLivePowerSeries(state);
    expect(Array.isArray(series)).toBe(true);
  });

  it('reflects new execution in recent automations when a rule executes', () => {
    const rule: Rule = useStore.getState().rules[0]!;
    expect(rule).toBeDefined();

    const executionEntry = {
      id: 'exec-test-1',
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: Date.now(),
      status: 'success' as const,
      actionsExecuted: rule.actions,
      reason: 'Ambient temperature reached setpoint',
    };

    useStore.getState().addExecution(executionEntry);

    const recent = selectRecentAutomations(useStore.getState(), 5);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent[0]?.ruleId).toBe(rule.id);
    expect(recent[0]?.status).toBe('success');
  });
});
