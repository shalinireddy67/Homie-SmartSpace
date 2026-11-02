/**
 * Schedule Engine & Due Dispatcher.
 * Pure TypeScript. Zero React imports.
 *
 * Guarantees:
 * - Computes next run timestamp DST-safely using local date parts.
 * - Handles: today later than now, today passed, empty weekdays (every day), disabled schedules (null).
 * - Comprehensive schedule validation: rejects missing device, incompatible action fields, invalid time format; warns on offline device.
 * - Single-fire execution per due time (guarded by lastFiredFor).
 * - Paused catch-up protection: never bursts missed runs; fires at most once and marks earlier missed runs skipped.
 * - Decoupled Schedule (config) and ScheduleExecution (history) store state.
 */

import type { Schedule, ScheduleExecution, Device } from '@/types';
import type { Clock, Scheduler, StoreAccessor } from './interfaces';
import { dispatchCommand } from './commands';
import { PRNG } from '@/utils/prng';

export interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScheduleRunnerDeps {
  clock: Clock;
  store: StoreAccessor;
  scheduler?: Scheduler;
  prng?: PRNG;
}

export interface ScheduleRunSummary {
  firedCount: number;
  skippedCount: number;
  executions: ScheduleExecution[];
}

/**
 * Computes the next execution timestamp (ms) for a given schedule relative to reference timestamp `now`.
 *
 * Rules:
 * - If schedule is disabled: returns null.
 * - Empty weekdays array means every day (0-6).
 * - Uses local date parts to ensure DST transitions are accounted for naturally.
 */
export function computeNextRun(schedule: Schedule, now: number): number | null {
  if (!schedule.enabled) {
    return null;
  }

  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(schedule.time);
  if (!timeMatch) {
    return null;
  }

  const targetHours = parseInt(timeMatch[1] ?? '0', 10);
  const targetMinutes = parseInt(timeMatch[2] ?? '0', 10);

  // Empty weekdays array represents every day
  const activeWeekdays =
    schedule.weekdays && schedule.weekdays.length > 0
      ? new Set(schedule.weekdays)
      : new Set([0, 1, 2, 3, 4, 5, 6]);

  const ref = new Date(now);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const date = ref.getDate();

  // Search forward up to 14 days for the earliest valid slot strictly after `now`
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    // Construct local date time (DST safe)
    const candidate = new Date(year, month, date + dayOffset, targetHours, targetMinutes, 0, 0);
    const candidateDayOfWeek = candidate.getDay();

    if (activeWeekdays.has(candidateDayOfWeek)) {
      const candidateTime = candidate.getTime();
      if (candidateTime > now) {
        return candidateTime;
      }
    }
  }

  return null;
}

/**
 * Validates schedule parameters against available device models and capabilities.
 */
export function validateSchedule(
  schedule: Schedule,
  devices: Device[]
): ScheduleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Time format validation (HH:mm 24-hour)
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule.time)) {
    errors.push(`Invalid schedule time format "${schedule.time}". Expected HH:mm (00:00 to 23:59).`);
  }

  // 2. Weekdays validation
  if (schedule.weekdays) {
    for (const day of schedule.weekdays) {
      if (day < 0 || day > 6 || !Number.isInteger(day)) {
        errors.push(`Invalid weekday index ${day}. Expected integer from 0 (Sunday) to 6 (Saturday).`);
      }
    }
  }

  // 3. Target device presence
  const targetDevice = devices.find((d) => d.id === schedule.deviceId);
  if (!targetDevice) {
    errors.push(`Target device "${schedule.deviceId}" does not exist.`);
    return { valid: false, errors, warnings };
  }

  // 4. Offline warning (offline device is allowed to have schedules, but warned)
  if (!targetDevice.online) {
    warnings.push(`Target device "${targetDevice.name}" is currently offline. Schedule may fail if offline when due.`);
  }

  // 5. Action compatibility with device type
  const action = schedule.action;
  if (!action || !action.field) {
    errors.push('Schedule action or field is missing.');
    return { valid: errors.length === 0, errors, warnings };
  }

  switch (targetDevice.type) {
    case 'light': {
      const allowed = ['on', 'brightness', 'color'];
      if (!allowed.includes(action.field)) {
        errors.push(`Field "${action.field}" is incompatible with light device.`);
      }
      if (action.field === 'brightness') {
        const b = Number(action.value);
        if (isNaN(b) || b < 0 || b > 100) {
          errors.push('Light brightness must be a number between 0 and 100.');
        }
      }
      if (action.field === 'color' && typeof action.value !== 'string') {
        errors.push('Light color must be a hex string.');
      }
      break;
    }
    case 'thermostat': {
      const allowed = ['target', 'unit'];
      if (!allowed.includes(action.field)) {
        errors.push(`Field "${action.field}" is incompatible with thermostat device.`);
      }
      if (action.field === 'target') {
        const t = Number(action.value);
        if (isNaN(t) || t < targetDevice.min || t > targetDevice.max) {
          errors.push(`Thermostat target must be between ${targetDevice.min} and ${targetDevice.max}.`);
        }
      }
      break;
    }
    case 'lock': {
      if (action.field !== 'locked') {
        errors.push(`Field "${action.field}" is incompatible with smart lock.`);
      }
      break;
    }
    case 'camera': {
      const allowed = ['active', 'motionDetection', 'privacyMode'];
      if (!allowed.includes(action.field)) {
        errors.push(`Field "${action.field}" is incompatible with camera device.`);
      }
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

let execCounter = 1;

/**
 * Evaluates all schedules, executes due actions, records execution history,
 * and advances nextRunTime.
 */
export async function runDueSchedules(deps: ScheduleRunnerDeps): Promise<ScheduleRunSummary> {
  const now = deps.clock.now();
  const state = deps.store.getState();
  const schedules = state.schedules;
  const executions: ScheduleExecution[] = [];

  let firedCount = 0;
  let skippedCount = 0;

  for (const schedule of schedules) {
    if (!schedule.enabled) {
      continue;
    }

    // Ensure nextRunTime is calculated
    let dueTime = schedule.nextRunTime;
    if (!dueTime || dueTime <= 0) {
      const calculated = computeNextRun(schedule, now);
      if (!calculated) continue;
      dueTime = calculated;
      state.updateSchedule(schedule.id, { nextRunTime: dueTime });
    }

    // Check if schedule is due
    if (dueTime <= now) {
      // Guard: already fired for this specific due time slot
      if (schedule.lastFiredFor === dueTime) {
        continue;
      }

      // Check if missed runs occurred while paused (e.g. dueTime was way in the past)
      // If dueTime was earlier than now - 1 minute and another run was due, record earlier as skipped
      const nextSlot = computeNextRun(schedule, dueTime);
      if (nextSlot && nextSlot <= now) {
        // Earlier run was missed during pause -> record skipped
        const skippedExec: ScheduleExecution = {
          id: `sched-exec-${now}-${execCounter++}`,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          firedAt: now,
          dueTime,
          status: 'skipped',
          result: 'Missed schedule execution during pause',
          action: schedule.action,
        };
        state.addScheduleExecution?.(skippedExec);
        executions.push(skippedExec);
        skippedCount++;

        // Advance to the current active slot
        dueTime = nextSlot;
      }

      // Check target device status
      const targetDevice = state.devices.find((d: Device) => d.id === schedule.deviceId);

      if (!targetDevice || !targetDevice.online) {
        // Offline device: record execution failure / skipped with explicit reason
        const offlineReason = targetDevice
          ? `Device is offline${targetDevice.offlineReason ? ` (${targetDevice.offlineReason})` : ''}`
          : 'Device not found';
        const failExec: ScheduleExecution = {
          id: `sched-exec-${now}-${execCounter++}`,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          firedAt: now,
          dueTime,
          status: 'skipped',
          result: `Skipped: ${offlineReason}`,
          action: schedule.action,
        };
        state.addScheduleExecution?.(failExec);
        executions.push(failExec);
        skippedCount++;
      } else {
        const activeScheduler: Scheduler = deps.scheduler ?? {
          delay: () => Promise.resolve(),
          setInterval: () => 0,
          clearInterval: () => {},
        };

        // Dispatch command with causedByAutomation: true to prevent cascade
        const cmdResult = await dispatchCommand(
          schedule.deviceId,
          { [schedule.action.field]: schedule.action.value },
          {
            clock: deps.clock,
            store: deps.store,
            scheduler: activeScheduler,
            prng: deps.prng,
            causedByAutomation: true,
          }
        );

        const execRecord: ScheduleExecution = {
          id: `sched-exec-${now}-${execCounter++}`,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          firedAt: now,
          dueTime,
          status: cmdResult.ok ? 'success' : 'failure',
          result: cmdResult.ok ? 'Executed successfully' : (cmdResult.reason ?? 'Command execution failed'),
          action: schedule.action,
        };

        state.addScheduleExecution?.(execRecord);
        executions.push(execRecord);
        firedCount++;
      }

      // Advance schedule to its next future occurrence and record lastFiredFor
      const nextRun = computeNextRun(schedule, now);
      state.updateSchedule(schedule.id, {
        nextRunTime: nextRun ?? 0,
        lastFiredFor: dueTime,
      });
    }
  }

  return {
    firedCount,
    skippedCount,
    executions,
  };
}
