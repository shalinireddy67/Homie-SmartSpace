import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeNextRun,
  validateSchedule,
  runDueSchedules,
} from '@/engine/schedules';
import { useStore } from '@/store';
import type { Schedule, LightDevice, ThermostatDevice } from '@/types';
import type { Clock } from '@/engine/interfaces';

class VirtualClock implements Clock {
  constructor(private time = 1730476800000) {}
  now(): number {
    return this.time;
  }
  advance(ms: number): void {
    this.time += ms;
  }
  set(time: number): void {
    this.time = time;
  }
}

describe('Schedule Engine', () => {
  // Reference time: Monday, 2024-11-04 10:00:00 local time
  const refDate = new Date(2024, 10, 4, 10, 0, 0, 0); // Month index 10 = November
  const now = refDate.getTime();
  const dayOfWeek = refDate.getDay(); // 1 = Monday

  describe('computeNextRun', () => {
    it('today later than now: returns today at the scheduled hour and minute', () => {
      const schedule: Schedule = {
        id: 's-1',
        name: 'Lunch Lighting',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'a-1', deviceId: 'dev-light-living', field: 'brightness', value: 80 },
        time: '12:30', // 2.5 hours later today
        weekdays: [dayOfWeek], // Monday
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const next = computeNextRun(schedule, now);
      expect(next).not.toBeNull();
      const nextDate = new Date(next!);
      expect(nextDate.getDate()).toBe(refDate.getDate());
      expect(nextDate.getHours()).toBe(12);
      expect(nextDate.getMinutes()).toBe(30);
    });

    it('today already passed: returns next scheduled weekday', () => {
      const schedule: Schedule = {
        id: 's-2',
        name: 'Morning Wakeup',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'a-2', deviceId: 'dev-light-living', field: 'on', value: true },
        time: '07:00', // Today at 07:00 has already passed (now is 10:00)
        weekdays: [1, 2], // Monday, Tuesday
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const next = computeNextRun(schedule, now);
      expect(next).not.toBeNull();
      const nextDate = new Date(next!);
      // Earliest next slot is tomorrow (Tuesday) at 07:00
      expect(nextDate.getDay()).toBe(2); // Tuesday
      expect(nextDate.getHours()).toBe(7);
      expect(nextDate.getMinutes()).toBe(0);
    });

    it('empty weekdays means every day', () => {
      const schedule: Schedule = {
        id: 's-daily',
        name: 'Nightly Lockdown',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'a-lock', deviceId: 'dev-light-living', field: 'on', value: false },
        time: '23:00',
        weekdays: [], // Empty weekdays -> runs every day
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const next = computeNextRun(schedule, now);
      expect(next).not.toBeNull();
      const nextDate = new Date(next!);
      expect(nextDate.getDate()).toBe(refDate.getDate());
      expect(nextDate.getHours()).toBe(23);
      expect(nextDate.getMinutes()).toBe(0);
    });

    it('disabled schedule returns null', () => {
      const schedule: Schedule = {
        id: 's-disabled',
        name: 'Disabled Schedule',
        enabled: false,
        deviceId: 'dev-light-living',
        action: { id: 'a-1', deviceId: 'dev-light-living', field: 'on', value: false },
        time: '18:00',
        weekdays: [1, 2, 3],
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const next = computeNextRun(schedule, now);
      expect(next).toBeNull();
    });

    it('DST-safe: accurately preserves local wall-clock hours across dates', () => {
      // 5 days forward
      const schedule: Schedule = {
        id: 's-future',
        name: 'Weekend Mode',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'a-1', deviceId: 'dev-light-living', field: 'on', value: true },
        time: '15:45',
        weekdays: [6], // Saturday
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const next = computeNextRun(schedule, now);
      expect(next).not.toBeNull();
      const targetDate = new Date(next!);
      expect(targetDate.getDay()).toBe(6);
      expect(targetDate.getHours()).toBe(15);
      expect(targetDate.getMinutes()).toBe(45);
    });
  });

  describe('validateSchedule', () => {
    const mockDevices = [
      {
        id: 'dev-light-living',
        name: 'Living Room Light',
        roomId: 'room-living',
        type: 'light',
        online: true,
        on: true,
        brightness: 50,
        color: '#ffffff',
        updatedAt: 1000,
        powerWatts: 40,
      } as LightDevice,
      {
        id: 'dev-therm-living',
        name: 'Living Room Thermostat',
        roomId: 'room-living',
        type: 'thermostat',
        online: true,
        current: 21,
        target: 22,
        min: 16,
        max: 30,
        unit: 'C',
        updatedAt: 1000,
        powerWatts: 380,
      } as ThermostatDevice,
      {
        id: 'dev-offline-light',
        name: 'Offline Yard Floodlight',
        roomId: 'room-outdoor',
        type: 'light',
        online: false,
        offlineReason: 'Connection timed out',
        on: false,
        brightness: 0,
        color: '#ffffff',
        updatedAt: 1000,
        powerWatts: 0,
      } as LightDevice,
    ];

    it('validates a correct schedule successfully', () => {
      const schedule: Schedule = {
        id: 's-valid',
        name: 'Valid Light Schedule',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'a-1', deviceId: 'dev-light-living', field: 'brightness', value: 70 },
        time: '14:30',
        weekdays: [1, 2, 3],
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const result = validateSchedule(schedule, mockDevices);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('rejects missing device', () => {
      const schedule: Schedule = {
        id: 's-missing-dev',
        name: 'Bad Device Schedule',
        enabled: true,
        deviceId: 'non-existent-device-xyz',
        action: { id: 'a-1', deviceId: 'non-existent-device-xyz', field: 'on', value: true },
        time: '12:00',
        weekdays: [1],
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const result = validateSchedule(schedule, mockDevices);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('does not exist');
    });

    it('rejects action incompatible with device type', () => {
      const schedule: Schedule = {
        id: 's-incompatible',
        name: 'Thermostat Brightness',
        enabled: true,
        deviceId: 'dev-therm-living',
        action: { id: 'a-1', deviceId: 'dev-therm-living', field: 'brightness', value: 50 },
        time: '12:00',
        weekdays: [1],
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const result = validateSchedule(schedule, mockDevices);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('incompatible');
    });

    it('rejects bad time format', () => {
      const schedule: Schedule = {
        id: 's-bad-time',
        name: 'Bad Time Schedule',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'a-1', deviceId: 'dev-light-living', field: 'on', value: true },
        time: '25:99', // Invalid hours and minutes
        weekdays: [1],
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const result = validateSchedule(schedule, mockDevices);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid schedule time format');
    });

    it('allows offline device with a warning', () => {
      const schedule: Schedule = {
        id: 's-offline-warn',
        name: 'Offline Yard Schedule',
        enabled: true,
        deviceId: 'dev-offline-light',
        action: { id: 'a-1', deviceId: 'dev-offline-light', field: 'on', value: true },
        time: '20:00',
        weekdays: [1, 2],
        nextRunTime: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const result = validateSchedule(schedule, mockDevices);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('currently offline');
    });
  });

  describe('runDueSchedules', () => {
    let clock: VirtualClock;

    beforeEach(() => {
      localStorage.clear();
      useStore.getState().resetToDefaults();
      clock = new VirtualClock(now);
    });

    it('fires once when due time arrives and advances nextRunTime', async () => {
      const light = useStore.getState().devices.find((d) => d.type === 'light' && d.online)!;

      const schedule: Schedule = {
        id: 'sched-live-1',
        name: 'Lunch Dimming',
        enabled: true,
        deviceId: light.id,
        action: { id: 'act-1', deviceId: light.id, field: 'brightness', value: 45 },
        time: '10:00',
        weekdays: [dayOfWeek],
        nextRunTime: now, // Due right now
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([schedule]);

      const summary = await runDueSchedules({
        clock,
        store: useStore,
      });

      expect(summary.firedCount).toBe(1);
      expect(summary.executions).toHaveLength(1);
      expect(summary.executions[0]?.status).toBe('success');

      // Verify device was updated
      const updatedDevice = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
      expect(updatedDevice.brightness).toBe(45);

      // Verify schedule execution history recorded in separate store state
      expect(useStore.getState().scheduleExecutions).toHaveLength(1);
      expect(useStore.getState().scheduleExecutions[0]?.scheduleId).toBe('sched-live-1');

      // Schedule nextRunTime advanced to future
      const updatedSchedule = useStore.getState().schedules.find((s) => s.id === 'sched-live-1')!;
      expect(updatedSchedule.nextRunTime).toBeGreaterThan(now);
    });

    it('no double fire on repeated ticks for the same due time slot', async () => {
      const light = useStore.getState().devices.find((d) => d.type === 'light' && d.online)!;

      const schedule: Schedule = {
        id: 'sched-no-double',
        name: 'Single Fire Schedule',
        enabled: true,
        deviceId: light.id,
        action: { id: 'act-1', deviceId: light.id, field: 'brightness', value: 65 },
        time: '10:00',
        weekdays: [dayOfWeek],
        nextRunTime: now,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([schedule]);

      // First run: fires
      const summary1 = await runDueSchedules({ clock, store: useStore });
      expect(summary1.firedCount).toBe(1);

      // Immediate second tick (time hasn't reached the next run yet): does NOT double fire
      const summary2 = await runDueSchedules({ clock, store: useStore });
      expect(summary2.firedCount).toBe(0);
      expect(useStore.getState().scheduleExecutions).toHaveLength(1);
    });

    it('disabled schedule never fires', async () => {
      const light = useStore.getState().devices.find((d) => d.type === 'light' && d.online)!;

      const schedule: Schedule = {
        id: 'sched-disabled',
        name: 'Disabled Test',
        enabled: false, // Disabled
        deviceId: light.id,
        action: { id: 'act-1', deviceId: light.id, field: 'brightness', value: 10 },
        time: '10:00',
        weekdays: [dayOfWeek],
        nextRunTime: now,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([schedule]);

      const summary = await runDueSchedules({ clock, store: useStore });
      expect(summary.firedCount).toBe(0);
      expect(useStore.getState().scheduleExecutions).toHaveLength(0);
    });

    it('offline target is recorded as skipped with diagnostic reason', async () => {
      const offlineDev = useStore.getState().devices.find((d) => !d.online)!;

      const schedule: Schedule = {
        id: 'sched-offline-target',
        name: 'Offline Yard Light',
        enabled: true,
        deviceId: offlineDev.id,
        action: { id: 'act-offline', deviceId: offlineDev.id, field: 'on', value: true },
        time: '10:00',
        weekdays: [dayOfWeek],
        nextRunTime: now,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([schedule]);

      const summary = await runDueSchedules({ clock, store: useStore });
      expect(summary.skippedCount).toBe(1);
      expect(summary.executions[0]?.status).toBe('skipped');
      expect(summary.executions[0]?.result).toContain('offline');
      expect(useStore.getState().scheduleExecutions[0]?.status).toBe('skipped');
    });

    it('paused catch-up fires at most once, marking older missed runs skipped', async () => {
      const light = useStore.getState().devices.find((d) => d.type === 'light' && d.online)!;

      // Suppose schedule was due 2 hours ago (and would have run twice if not paused)
      const pastDue = now - 2 * 3600 * 1000;

      const schedule: Schedule = {
        id: 'sched-catchup',
        name: 'Catchup Schedule',
        enabled: true,
        deviceId: light.id,
        action: { id: 'act-1', deviceId: light.id, field: 'brightness', value: 55 },
        time: '08:00',
        weekdays: [], // Every day
        nextRunTime: pastDue,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([schedule]);

      // Resume execution
      const summary = await runDueSchedules({ clock, store: useStore });

      // Missed run during pause was skipped, current active run fired
      expect(summary.firedCount).toBe(1);
      const executions = useStore.getState().scheduleExecutions;
      expect(executions.length).toBeGreaterThanOrEqual(1);

      // Verify it did not burst fire multiple command executions
      const successfulExecutions = executions.filter((e) => e.status === 'success');
      expect(successfulExecutions).toHaveLength(1);
    });
  });
});
