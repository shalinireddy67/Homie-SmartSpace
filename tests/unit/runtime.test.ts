import { describe, it, expect, beforeEach } from 'vitest';
import { createRuntime, type Runtime } from '@/engine/runtime';
import { dryRunRule } from '@/engine/dryRun';
import { dispatchCommand } from '@/engine/commands';
import { useStore } from '@/store';
import type { Clock, Scheduler } from '@/engine/interfaces';
import type { Rule, Schedule, LightDevice, ThermostatDevice } from '@/types';

class FakeClock implements Clock {
  constructor(public time: number = 1730476800000) {}
  now(): number {
    return this.time;
  }
  advance(ms: number): void {
    this.time += ms;
  }
}

class FakeScheduler implements Scheduler {
  public callbacks: Array<() => Promise<void> | void> = [];
  public activeTimerCount = 0;

  delay(_ms: number): Promise<void> {
    return Promise.resolve();
  }

  setInterval(callback: () => void, _ms: number): unknown {
    this.activeTimerCount++;
    this.callbacks.push(callback);
    return callback;
  }

  clearInterval(handle: unknown): void {
    this.activeTimerCount = Math.max(0, this.activeTimerCount - 1);
    const idx = this.callbacks.indexOf(handle as () => void);
    if (idx !== -1) this.callbacks.splice(idx, 1);
  }

  scheduleRepeating(fn: () => void, _intervalMs: number): () => void {
    this.activeTimerCount++;
    this.callbacks.push(fn);
    return () => {
      this.activeTimerCount = Math.max(0, this.activeTimerCount - 1);
      const idx = this.callbacks.indexOf(fn);
      if (idx !== -1) this.callbacks.splice(idx, 1);
    };
  }

  async triggerAll(): Promise<void> {
    for (const cb of [...this.callbacks]) {
      await cb();
    }
  }
}

describe('Central Runtime Integration', () => {
  let clock: FakeClock;
  let scheduler: FakeScheduler;
  let runtime: Runtime;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();

    clock = new FakeClock(1730476800000);
    scheduler = new FakeScheduler();

    runtime = createRuntime({
      store: useStore,
      clock,
      scheduler,
      baseIntervalMs: 1000,
    });
  });

  it('Full chain: temperature rises past rule threshold, rule fires once, light changes, event & notification created, rule does not re-fire until false-then-true', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;
    const therm = useStore.getState().devices.find((d): d is ThermostatDevice => d.type === 'thermostat' && d.online)!;

    // Initial state: thermostat at 21°C, light brightness 50
    useStore.getState().updateDevice(light.id, { brightness: 50 });
    useStore.getState().updateDevice(therm.id, { current: 21.0 });
    useStore.getState().updateRoom(therm.roomId, { ambientTemp: 21.0 });

    const rule: Rule = {
      id: 'rule-temp-trigger',
      name: 'High Heat Trigger Light',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: 'c-1',
            deviceId: therm.id,
            field: 'current',
            operator: '>',
            value: 24.0,
          },
        ],
      },
      actions: [
        {
          id: 'act-1',
          deviceId: light.id,
          field: 'brightness',
          value: 95,
        },
      ],
      cooldownMinutes: 1,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    useStore.getState().setRules([rule]);

    // 1. First step: condition is false (21 <= 24). Light remains 50.
    await runtime.step();
    expect((useStore.getState().devices.find((d) => d.id === light.id) as LightDevice).brightness).toBe(50);
    expect(useStore.getState().executionHistory).toHaveLength(0);

    // 2. Temperature rises to 26°C (transitions false -> true)
    useStore.getState().updateRoom(therm.roomId, { ambientTemp: 26.0 });
    useStore.getState().updateDevice(therm.id, { current: 26.0 });
    await runtime.step();

    // Light changed, execution recorded, event logged
    expect((useStore.getState().devices.find((d) => d.id === light.id) as LightDevice).brightness).toBe(95);
    expect(useStore.getState().executionHistory).toHaveLength(1);
    expect(useStore.getState().executionHistory[0]?.status).toBe('success');

    const automationEvents = useStore.getState().events.filter((e) => e.type === 'automation');
    expect(automationEvents.length).toBeGreaterThanOrEqual(1);

    // 3. Second step while temperature is STILL 26°C (continuously true): DOES NOT RE-FIRE
    await runtime.step();
    expect(useStore.getState().executionHistory).toHaveLength(1);

    // 4. Temperature drops below threshold to 22°C (true -> false)
    useStore.getState().updateRoom(therm.roomId, { ambientTemp: 22.0 });
    useStore.getState().updateDevice(therm.id, { current: 22.0 });
    await runtime.step();
    expect(useStore.getState().executionHistory).toHaveLength(1);

    // 5. Advance past cooldown and temperature rises to 27°C again (false -> true)
    clock.advance(120000);
    useStore.getState().updateRoom(therm.roomId, { ambientTemp: 27.0 });
    useStore.getState().updateDevice(therm.id, { current: 27.0 });
    await runtime.step();

    // Fires second time!
    expect(useStore.getState().executionHistory).toHaveLength(2);
  });

  it('Loop guard: automation action does not trigger another automation', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;
    const therm = useStore.getState().devices.find((d): d is ThermostatDevice => d.type === 'thermostat' && d.online)!;

    useStore.getState().updateDevice(light.id, { on: false });
    useStore.getState().updateDevice(therm.id, { current: 20.0 });
    useStore.getState().updateRoom(therm.roomId, { ambientTemp: 20.0 });

    // Rule 1: Temperature > 24 turns light on
    const rule1: Rule = {
      id: 'rule-cascade-1',
      name: 'Temp Heat Light',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [{ id: 'c-1', deviceId: therm.id, field: 'current', operator: '>', value: 24.0 }],
      },
      actions: [{ id: 'act-1', deviceId: light.id, field: 'on', value: true }],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    // Rule 2: Light is on sets thermostat target to 25
    const rule2: Rule = {
      id: 'rule-cascade-2',
      name: 'Light Turns Heat Up',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [{ id: 'c-2', deviceId: light.id, field: 'on', operator: '==', value: true }],
      },
      actions: [{ id: 'act-2', deviceId: therm.id, field: 'target', value: 25 }],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    useStore.getState().setRules([rule1, rule2]);

    // Temperature rises to 26°C -> rule1 fires
    useStore.getState().updateRoom(therm.roomId, { ambientTemp: 26.0 });
    useStore.getState().updateDevice(therm.id, { current: 26.0 });
    await runtime.step();

    // Rule 1 executed
    expect((useStore.getState().devices.find((d) => d.id === light.id) as LightDevice).on).toBe(true);

    // Rule 2 should NOT have executed during the same tick (causedByAutomation blocks cascade)
    const rule2Executions = useStore.getState().executionHistory.filter((e) => e.ruleId === 'rule-cascade-2');
    expect(rule2Executions).toHaveLength(0);
  });

  it('Failed command (failNextCommand) gives rollback, toast, notification, and event consistently', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;
    useStore.getState().updateDevice(light.id, { brightness: 50 });

    useStore.getState().setFailNextCommand(true);

    // Dispatch a command that is configured to fail
    const result = await dispatchCommand(
      light.id,
      { brightness: 90 },
      {
        store: useStore,
        clock,
        scheduler,
      }
    );

    expect(result.ok).toBe(false);

    // 1. Rollback restored brightness
    const restored = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(restored.brightness).toBe(50);

    // 2. Toast pushed
    expect(useStore.getState().toasts.length).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().toasts[0]?.severity).toBe('danger');

    // 3. Notification recorded
    const notifs = useStore.getState().notifications;
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    expect(notifs[0]?.severity).toBe('danger');

    // 4. Event logged
    const failedEvents = useStore.getState().events.filter(
      (e) => e.type === 'command' && (e.severity === 'alert' || e.severity === 'warning')
    );
    expect(failedEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('Device goes offline gives one notification (no repeat inside cooldown), online gives one more', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;

    // 1. Device transitions to offline
    useStore.getState().updateDevice(light.id, { online: false, offlineReason: 'Ping loss' });
    await runtime.step();

    const offlineNotifs = useStore.getState().notifications.filter((n) => n.title.includes('Offline'));
    expect(offlineNotifs).toHaveLength(1);

    // 2. Repeat tick within cooldown -> no duplicate notification
    await runtime.step();
    const offlineNotifs2 = useStore.getState().notifications.filter((n) => n.title.includes('Offline'));
    expect(offlineNotifs2).toHaveLength(1);

    // 3. Device reconnects online
    useStore.getState().updateDevice(light.id, { online: true });
    await runtime.step();

    const onlineNotifs = useStore.getState().notifications.filter((n) => n.title.includes('Online'));
    expect(onlineNotifs).toHaveLength(1);
  });

  it('Anomaly in telemetry gives one notification, not one per tick', async () => {
    // Run an initial step so device power is in steady state
    await runtime.step();
    useStore.getState().setNotifications([]);

    const steadyWatts = useStore.getState().liveTelemetry.slice(-1)[0]?.totalWatts ?? 500;

    // Fill trailing baseline with 24 normal readings matching steady state
    const baselineReadings = Array.from({ length: 24 }, (_, i) => ({
      timestamp: clock.now() - (24 - i) * 60000,
      totalWatts: steadyWatts,
      roomWatts: { 'room-living': steadyWatts },
      deviceWatts: { 'dev-light-living': steadyWatts },
    }));

    useStore.getState().setLiveTelemetry(baselineReadings);

    // Step to consume initial readings
    await runtime.step();
    const initialAnomNotifs = useStore.getState().notifications.filter((n) => n.title.includes('Surge'));
    expect(initialAnomNotifs).toHaveLength(0);

    // Inject sudden high-power surge reading (steadyWatts + 2500)
    useStore.getState().appendLiveTelemetry({
      timestamp: clock.now(),
      totalWatts: steadyWatts + 2500, // Massive surge
      roomWatts: { 'room-living': steadyWatts + 2500 },
      deviceWatts: { 'dev-light-living': steadyWatts + 2500 },
    });

    // Step: anomaly detected and notified
    await runtime.step();
    const surgeNotifs = useStore.getState().notifications.filter((n) => n.title.includes('Surge'));
    expect(surgeNotifs).toHaveLength(1);

    // Immediate next step: should NOT repeat notification due to cooldown
    await runtime.step();
    const surgeNotifsRepeat = useStore.getState().notifications.filter((n) => n.title.includes('Surge'));
    expect(surgeNotifsRepeat).toHaveLength(1);
  });

  it('Schedule fires once and appears in schedule execution history, not in config', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;

    const schedule: Schedule = {
      id: 'sched-runtime-1',
      name: 'Evening Lighting',
      enabled: true,
      deviceId: light.id,
      action: { id: 'act-1', deviceId: light.id, field: 'brightness', value: 85 },
      time: '18:00',
      weekdays: [], // Every day
      nextRunTime: clock.now(), // Due immediately
      createdAt: 1000,
      modifiedAt: 1000,
    };

    useStore.getState().setSchedules([schedule]);

    await runtime.step();

    // Schedule configuration nextRunTime is updated, no history attached inside schedule object
    const storedSchedule = useStore.getState().schedules.find((s) => s.id === 'sched-runtime-1')!;
    expect(storedSchedule.nextRunTime).toBeGreaterThan(clock.now());

    // Execution recorded in separate store slice
    expect(useStore.getState().scheduleExecutions).toHaveLength(1);
    expect(useStore.getState().scheduleExecutions[0]?.scheduleId).toBe('sched-runtime-1');
  });

  it('Strict Mode: start, stop, start gives exactly one active timer', () => {
    expect(runtime.getTimerCount()).toBe(0);

    // First mount
    runtime.start();
    expect(runtime.getTimerCount()).toBe(1);

    // Strict Mode unmount
    runtime.stop();
    expect(runtime.getTimerCount()).toBe(0);

    // Strict Mode remount
    runtime.start();
    expect(runtime.getTimerCount()).toBe(1);

    // Calling start again idempotently preserves exactly 1 timer
    runtime.start();
    expect(runtime.getTimerCount()).toBe(1);

    runtime.stop();
    expect(runtime.getTimerCount()).toBe(0);
  });

  it('Dry run during a running runtime changes nothing and creates no execution', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;

    runtime.start();

    const snapshotBefore = JSON.parse(JSON.stringify(useStore.getState()));

    const testRule: Rule = {
      id: 'dry-rule-runtime',
      name: 'Dry Rule In Running System',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] },
      actions: [{ id: 'a-1', deviceId: light.id, field: 'brightness', value: 10 }],
      cooldownMinutes: 0,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    const report = dryRunRule(testRule, {
      devices: useStore.getState().devices,
      rooms: useStore.getState().rooms,
      currentTime: clock.now(),
      totalWatts: 100,
    });

    expect(report.simulation).toBe(true);
    expect(report.proposedActions[0]?.willRun).toBe(true);

    const snapshotAfter = JSON.parse(JSON.stringify(useStore.getState()));

    // Store state remains completely unchanged
    expect(snapshotAfter.executionHistory).toEqual(snapshotBefore.executionHistory);
    expect(snapshotAfter.scheduleExecutions).toEqual(snapshotBefore.scheduleExecutions);
    expect(snapshotAfter.devices).toEqual(snapshotBefore.devices);
    expect(snapshotAfter.notifications).toEqual(snapshotBefore.notifications);

    runtime.stop();
  });

  it('Pause stops all execution; resume continues', async () => {
    const light = useStore.getState().devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;

    const schedule: Schedule = {
      id: 'sched-pause-test',
      name: 'Paused Schedule',
      enabled: true,
      deviceId: light.id,
      action: { id: 'act-1', deviceId: light.id, field: 'brightness', value: 30 },
      time: '12:00',
      weekdays: [],
      nextRunTime: clock.now(),
      createdAt: 1000,
      modifiedAt: 1000,
    };

    useStore.getState().setSchedules([schedule]);

    // Pause system
    runtime.start();
    useStore.getState().setRunning(false);

    // Trigger tick while paused
    await scheduler.triggerAll();

    // Nothing executed
    expect(useStore.getState().scheduleExecutions).toHaveLength(0);

    // Resume system
    useStore.getState().setRunning(true);
    await scheduler.triggerAll();

    // Now it executes
    expect(useStore.getState().scheduleExecutions).toHaveLength(1);

    runtime.stop();
  });

  it('benchmark: measures and prints real execution time for 1,000 runtime steps', async () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      clock.advance(1000);
      await runtime.step(1000);
    }

    const duration = performance.now() - start;
    console.log(`[Benchmark] Executed 1,000 full runtime steps in ${duration.toFixed(2)} ms (${(duration / 1000).toFixed(3)} ms/step)`);

    expect(duration).toBeGreaterThan(0);
  });
});
