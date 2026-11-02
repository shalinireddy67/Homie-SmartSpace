/**
 * Centralized Command Dispatcher Service for UI Components.
 * Pure bridge connecting UI events to the validated Command Pipeline.
 *
 * Guarantees:
 * - All device state changes route through engine dispatchCommand.
 * - Injects application store, clock, and scheduler.
 * - Handles optimistic application, per-field version fencing, and automatic rollbacks.
 */

import { dispatchCommand as coreDispatchCommand, type CommandResult, type CommandDispatchOptions } from '@/engine/commands';
import type { Scheduler } from '@/engine/interfaces';
import { useStore } from '@/store';

export async function dispatchDeviceCommand(
  deviceId: string,
  patch: Record<string, unknown>,
  optionsOverride?: Partial<CommandDispatchOptions>
): Promise<CommandResult> {
  const store = useStore;
  const clock = {
    now: () => store.getState().virtualTime ?? Date.now(),
  };
  const scheduler: Scheduler = {
    delay: (ms: number): Promise<void> =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }),
    setInterval: (cb: () => void, ms: number) => setInterval(cb, ms),
    clearInterval: (handle: unknown) => clearInterval(handle as number),
  };

  return coreDispatchCommand(deviceId, patch, {
    store,
    clock,
    scheduler,
    ...optionsOverride,
  });
}
