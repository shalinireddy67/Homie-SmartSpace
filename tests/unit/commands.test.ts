import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dispatchCommand } from '@/engine/commands';
import { useStore } from '@/store';
import type { LightDevice, ThermostatDevice } from '@/types';
import type { Clock, Scheduler } from '@/engine/interfaces';

class FakeClock implements Clock {
  currentTime = 1730476800000;
  now(): number {
    return this.currentTime;
  }
  advance(ms: number): void {
    this.currentTime += ms;
  }
}

class FakeScheduler implements Scheduler {
  async delay(_ms: number): Promise<void> {
    // Instant resolution in fake scheduler
    return Promise.resolve();
  }
  setInterval(_callback: () => void, _ms: number): number {
    return 1;
  }
  clearInterval(_handle: unknown): void {}
}

describe('Command Dispatcher & Rollback Engine', () => {
  let clock: FakeClock;
  let scheduler: FakeScheduler;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
    clock = new FakeClock();
    scheduler = new FakeScheduler();
  });

  it('keeps new state on successful command execution', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
    expect(light).toBeDefined();

    const result = await dispatchCommand(
      light.id,
      { brightness: 90, on: true },
      {
        store: useStore,
        clock,
        scheduler,
        executor: async () => true, // Simulate success
      }
    );

    expect(result.ok).toBe(true);

    const updated = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(updated.brightness).toBe(90);
    expect(updated.on).toBe(true);
    expect(updated.powerWatts).toBeGreaterThan(0);
  });

  it('restores previous value and resets flag when failNextCommand is active', async () => {
    useStore.getState().setFailNextCommand(true);
    expect(useStore.getState().failNextCommand).toBe(true);

    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
    const originalBrightness = light.brightness; // 80

    const result = await dispatchCommand(
      light.id,
      { brightness: 30 },
      {
        store: useStore,
        clock,
        scheduler,
      }
    );

    expect(result.ok).toBe(false);
    // Flag must be consumed and reset to false
    expect(useStore.getState().failNextCommand).toBe(false);

    // Value must be rolled back to original
    const restored = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(restored.brightness).toBe(originalBrightness);

    // Toast and notification should be emitted
    expect(useStore.getState().toasts.length).toBeGreaterThan(0);
    expect(useStore.getState().notifications.length).toBeGreaterThan(0);
  });

  it('rejects command for offline device with explicit reason string', async () => {
    const offlineDev = useStore.getState().devices.find((d) => !d.online);
    expect(offlineDev).toBeDefined();
    if (!offlineDev) return;

    const result = await dispatchCommand(
      offlineDev.id,
      { active: true },
      {
        store: useStore,
        clock,
        scheduler,
      }
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('offline');
    expect(result.reason).toContain(offlineDev.offlineReason || '');
  });

  it('rejects invalid brightness values outside 0-100', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;

    const resultNegative = await dispatchCommand(
      light.id,
      { brightness: -10 },
      { store: useStore, clock, scheduler }
    );
    expect(resultNegative.ok).toBe(false);
    expect(resultNegative.reason).toContain('between 0 and 100');

    const resultExcess = await dispatchCommand(
      light.id,
      { brightness: 150 },
      { store: useStore, clock, scheduler }
    );
    expect(resultExcess.ok).toBe(false);
  });

  it('rejects thermostat target outside min and max without clamping', async () => {
    const therm = useStore.getState().devices.find((d) => d.id === 'dev-therm-living') as ThermostatDevice;
    expect(therm.min).toBe(16);
    expect(therm.max).toBe(30);

    // Below min
    const resultLow = await dispatchCommand(
      therm.id,
      { target: 12 },
      { store: useStore, clock, scheduler }
    );
    expect(resultLow.ok).toBe(false);
    expect(resultLow.reason).toContain('between 16°C and 30°C');

    // Above max
    const resultHigh = await dispatchCommand(
      therm.id,
      { target: 35 },
      { store: useStore, clock, scheduler }
    );
    expect(resultHigh.ok).toBe(false);

    // Verify state was not modified or clamped
    const current = useStore.getState().devices.find((d) => d.id === therm.id) as ThermostatDevice;
    expect(current.target).toBe(therm.target);
  });

  it('turns light off when brightness is set to 0', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;

    await dispatchCommand(
      light.id,
      { brightness: 0 },
      {
        store: useStore,
        clock,
        scheduler,
        executor: async () => true,
      }
    );

    const updated = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(updated.brightness).toBe(0);
    expect(updated.on).toBe(false);
    expect(updated.powerWatts).toBe(0);
  });

  it('sets brightness to 100 when turning a light on at brightness 0', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
    useStore.getState().updateDevice(light.id, { brightness: 0, on: false });

    await dispatchCommand(
      light.id,
      { on: true },
      {
        store: useStore,
        clock,
        scheduler,
        executor: async () => true,
      }
    );

    const updated = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(updated.on).toBe(true);
    expect(updated.brightness).toBe(100);
  });

  it('overlap rule: older failure does not overwrite newer successful update on same field', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;

    // Simulate Command A (will fail slowly)
    let resolveCmdA: (val: boolean) => void;
    const promiseA = new Promise<boolean>((resolve) => {
      resolveCmdA = resolve;
    });

    const dispatchPromiseA = dispatchCommand(
      light.id,
      { brightness: 25 },
      {
        store: useStore,
        clock,
        scheduler,
        executor: () => promiseA,
      }
    );

    // While Command A is in flight, Command B is dispatched and succeeds with brightness = 95
    const resultB = await dispatchCommand(
      light.id,
      { brightness: 95 },
      {
        store: useStore,
        clock,
        scheduler,
        executor: async () => true,
      }
    );
    expect(resultB.ok).toBe(true);
    expect((useStore.getState().devices.find((d) => d.id === light.id) as LightDevice).brightness).toBe(95);

    // Now Command A completes with FAILURE
    resolveCmdA!(false);
    const resultA = await dispatchPromiseA;
    expect(resultA.ok).toBe(false);

    // Overlap rule: Command A failure must NOT overwrite Command B's value!
    const finalDevice = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(finalDevice.brightness).toBe(95);
  });

  it('rolls back unrelated field when another field was touched', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
    const originalColor = light.color;

    // Dispatch command changing color that fails
    const result = await dispatchCommand(
      light.id,
      { color: '#ff0000' },
      {
        store: useStore,
        clock,
        scheduler,
        executor: async () => false, // Fails
      }
    );

    expect(result.ok).toBe(false);
    const restored = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(restored.color).toBe(originalColor);
  });

  it('recomputes powerWatts correctly after optimistic apply and rollback', async () => {
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
    const initialWatts = light.powerWatts;

    useStore.getState().setFailNextCommand(true);

    await dispatchCommand(
      light.id,
      { brightness: 10 },
      {
        store: useStore,
        clock,
        scheduler,
      }
    );

    // After failure and rollback, powerWatts must match the rolled-back state
    const afterRollback = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
    expect(afterRollback.powerWatts).toBe(initialWatts);
  });

  it('does NOT use Math.random inside dispatchCommand', async () => {
    const randomSpy = vi.spyOn(Math, 'random');
    const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;

    await dispatchCommand(
      light.id,
      { brightness: 75 },
      {
        store: useStore,
        clock,
        scheduler,
        executor: async () => true,
      }
    );

    expect(randomSpy).not.toHaveBeenCalled();
    randomSpy.mockRestore();
  });
});

