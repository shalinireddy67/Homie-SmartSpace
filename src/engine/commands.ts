/**
 * Command Dispatcher with Optimistic Updates & Per-Field Rollback Fencing.
 * Pure TypeScript. Zero React imports. All side-effects (clock, timers, store) are injected.
 */

import type { Device, LightDevice, ThermostatDevice } from '@/types';
import type { RootStore } from '@/store';
import { PRNG } from '@/utils/prng';
import type { Clock, Scheduler, CommandResult } from './interfaces';

export interface StoreAccessor {
  getState: () => RootStore;
  setState: (
    partial: Partial<RootStore> | ((state: RootStore) => Partial<RootStore>)
  ) => void;
}

export type CommandExecutor = (
  deviceId: string,
  patch: Record<string, unknown>
) => Promise<boolean>;

export interface CommandDispatchOptions {
  store: StoreAccessor;
  clock: Clock;
  scheduler: Scheduler;
  executor?: CommandExecutor;
  prng?: PRNG;
  latencyMs?: number;
  causedByAutomation?: boolean;
}

/**
 * Calculates current power consumption in Watts based on realistic device state.
 * Offline devices draw 0 W. Off devices draw ~0 W.
 */
export function computeDevicePowerWatts(dev: Device): number {
  if (!dev.online) return 0;

  if (dev.type === 'light') {
    if (!dev.on || dev.brightness <= 0) return 0;
    // Scale smoothly from 5W to 60W based on brightness
    return Math.round(5 + (dev.brightness / 100) * 55);
  }

  if (dev.type === 'thermostat') {
    // When actively conditioning towards target (delta > 0.5°C), draw heating/cooling power
    const delta = Math.abs(dev.target - dev.current);
    return delta > 0.5 ? 380 : 18;
  }

  if (dev.type === 'lock') {
    return 2; // Standby radio power
  }

  if (dev.type === 'camera') {
    return dev.active ? 10 : 1;
  }

  return 0;
}

let commandCounter = 0;

/**
 * Dispatches a simulated IoT command with optimistic execution and per-field rollback.
 *
 * Rules:
 * 1. Brightness 0 sets light `on: false`.
 * 2. Turning a light `on: true` when its brightness is 0 sets `brightness: 100`.
 * 3. Thermostat target must strictly fall between [min, max]. Out-of-bounds values are REJECTED without clamping.
 * 4. Offline devices reject commands with an explicit descriptive reason.
 * 5. Deterministic failure occurs when simulationSlice.failNextCommand is true (consumed once),
 *    or probabilistically using PRNG (never Math.random).
 * 6. Rollback fencing: older failed commands never overwrite newer successful updates on that specific field.
 */
export async function dispatchCommand(
  deviceId: string,
  rawPatch: Record<string, unknown>,
  options: CommandDispatchOptions
): Promise<CommandResult> {
  const { store, clock, scheduler, executor, latencyMs = 200 } = options;
  const activeScheduler: Scheduler = scheduler ?? {
    delay: () => Promise.resolve(),
    scheduleRepeating: () => () => {},
  };
  const now = clock.now();
  commandCounter++;
  const commandId = `cmd-${now}-${commandCounter}`;

  const state = store.getState();
  const targetDevice = state.devices.find((d) => d.id === deviceId);

  // 1. Validation: Device existence
  if (!targetDevice) {
    return {
      ok: false,
      reason: `Device not found: ${deviceId}`,
      commandId,
    };
  }

  // 1. Validation: Online status
  if (!targetDevice.online) {
    const reason = `Device is offline: ${targetDevice.offlineReason || 'Hardware unreachable'}`;
    return {
      ok: false,
      reason,
      commandId,
    };
  }

  // Normalize and validate patch according to domain rules
  const normalizedPatch: Record<string, unknown> = { ...rawPatch };

  // Validation & Rule: Brightness bounds and Light state coupling
  if (targetDevice.type === 'light') {
    const light = targetDevice as LightDevice;

    if ('brightness' in normalizedPatch) {
      const b = normalizedPatch['brightness'];
      if (typeof b !== 'number' || b < 0 || b > 100) {
        return {
          ok: false,
          reason: 'Brightness must be a number between 0 and 100',
          commandId,
        };
      }

      // Rule: Brightness 0 sets light off
      if (b === 0) {
        normalizedPatch['on'] = false;
      }
    }

    if ('on' in normalizedPatch) {
      const turningOn = Boolean(normalizedPatch['on']);
      const currentOrNewBrightness =
        typeof normalizedPatch['brightness'] === 'number'
          ? (normalizedPatch['brightness'] as number)
          : light.brightness;

      // Rule: Turning a light on at brightness 0 sets brightness 100
      if (turningOn && currentOrNewBrightness === 0) {
        normalizedPatch['brightness'] = 100;
      }
    }
  }

  // Validation & Rule: Thermostat target temperature limits (NO CLAMP)
  if (targetDevice.type === 'thermostat') {
    const therm = targetDevice as ThermostatDevice;
    if ('target' in normalizedPatch) {
      const t = normalizedPatch['target'];
      if (typeof t !== 'number' || t < therm.min || t > therm.max) {
        return {
          ok: false,
          reason: `Target temperature must be between ${therm.min}°C and ${therm.max}°C`,
          commandId,
        };
      }
    }
  }

  // 2. Snapshot previous values of ONLY the patched fields
  const previousValues: Record<string, unknown> = {};
  const patchedFieldKeys = Object.keys(normalizedPatch);
  for (const field of patchedFieldKeys) {
    previousValues[field] = (targetDevice as unknown as Record<string, unknown>)[field];
  }

  // 3. Obtain a monotonic sequence number per field using store helpers
  const fieldSequences: Record<string, number> = {};
  for (const field of patchedFieldKeys) {
    fieldSequences[field] = store.getState().nextSequence(deviceId, field);
  }

  // 4. Apply patch optimistically to store immediately and recompute power
  const optimisticDevice = {
    ...targetDevice,
    ...normalizedPatch,
    updatedAt: now,
  } as Device;
  optimisticDevice.powerWatts = computeDevicePowerWatts(optimisticDevice);

  store.getState().updateDevice(deviceId, optimisticDevice);

  // 5. Simulate execution and determine success/failure
  let shouldFail = false;
  let failureReason = 'Simulated hardware command timeout';

  const currentState = store.getState();
  if (currentState.failNextCommand) {
    shouldFail = true;
    failureReason = 'Debug toggle triggered simulated failure';
    // Consume the failNextCommand flag after one use
    store.getState().setFailNextCommand(false);

    if (executor) {
      await executor(deviceId, normalizedPatch).catch(() => {});
    } else {
      await activeScheduler.delay(latencyMs);
    }
  } else if (executor) {
    try {
      const execResult = await executor(deviceId, normalizedPatch);
      if (!execResult) {
        shouldFail = true;
        failureReason = 'Simulated command execution failed';
      }
    } catch (err) {
      shouldFail = true;
      failureReason = err instanceof Error ? err.message : 'Executor exception';
    }
  } else {
    // Determine failure via seeded PRNG (never Math.random)
    const prng = options.prng || new PRNG(currentState.seed + commandCounter);
    if (prng.next() < currentState.failureProbability) {
      shouldFail = true;
      failureReason = 'Simulated wireless mesh packet drop';
    }
    await activeScheduler.delay(latencyMs);
  }

  // 7. Success branch
  if (!shouldFail) {
    // Log success event
    store.getState().addEvent({
      id: `evt-${commandId}-success`,
      timestamp: clock.now(),
      type: 'command',
      severity: 'success',
      deviceId,
      roomId: targetDevice.roomId,
      description: `Command confirmed for ${targetDevice.name}`,
      details: {
        commandId,
        fields: patchedFieldKeys.join(', '),
      },
    });

    return {
      ok: true,
      commandId,
    };
  }

  // 8. Failure branch: Rollback ONLY fields where canRollback is true
  const currentDev = store.getState().devices.find((d) => d.id === deviceId);
  if (currentDev) {
    const rolledBackFields: Record<string, unknown> = {};

    for (const field of patchedFieldKeys) {
      const seq = fieldSequences[field];
      if (seq && store.getState().canRollback(deviceId, field, seq)) {
        // Rollback allowed for this field: restore previous value
        rolledBackFields[field] = previousValues[field];
      }
      // If canRollback returned false, a newer command touched this field. Do not overwrite!
    }

    if (Object.keys(rolledBackFields).length > 0) {
      const restoredDev = {
        ...currentDev,
        ...rolledBackFields,
        updatedAt: clock.now(),
      } as Device;
      restoredDev.powerWatts = computeDevicePowerWatts(restoredDev);

      store.getState().updateDevice(deviceId, restoredDev);
    }
  }

  // 9. Failure side-effects: Push toast and notification
  store.getState().addToast({
    id: `toast-${commandId}`,
    title: `Command Failed: ${targetDevice.name}`,
    message: failureReason,
    severity: 'danger',
    durationMs: 4000,
  });

  store.getState().addNotification({
    id: `notif-${commandId}`,
    timestamp: clock.now(),
    title: `Command Failed: ${targetDevice.name}`,
    message: `Attempted to update ${patchedFieldKeys.join(', ')}. ${failureReason}`,
    severity: 'danger',
    read: false,
    category: 'device',
  });

  // 10. Log failure event
  store.getState().addEvent({
    id: `evt-${commandId}-fail`,
    timestamp: clock.now(),
    type: 'command',
    severity: 'warning',
    deviceId,
    roomId: targetDevice.roomId,
    description: `Command failed for ${targetDevice.name}: ${failureReason}`,
    details: {
      commandId,
      reason: failureReason,
      rolledBack: true,
      fields: patchedFieldKeys.join(', '),
    },
  });

  return {
    ok: false,
    reason: failureReason,
    commandId,
  };
}
