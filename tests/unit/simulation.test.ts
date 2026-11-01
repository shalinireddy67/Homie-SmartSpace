import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from '@/engine/simulation';
import { useStore } from '@/store';
import { PRNG } from '@/utils/prng';
import type { Clock, Scheduler } from '@/engine/interfaces';

class TestClock implements Clock {
  currentTime = 1730476800000;
  now(): number {
    return this.currentTime;
  }
  advance(ms: number): void {
    this.currentTime += ms;
  }
}

class TestScheduler implements Scheduler {
  timerCount = 0;
  activeCallbacks: Array<() => void> = [];

  async delay(_ms: number): Promise<void> {
    return Promise.resolve();
  }

  setInterval(callback: () => void, _ms: number): number {
    this.timerCount++;
    this.activeCallbacks.push(callback);
    return this.timerCount;
  }

  clearInterval(_handle: unknown): void {
    if (this.timerCount > 0) {
      this.timerCount--;
    }
    this.activeCallbacks = [];
  }

  triggerTick(): void {
    for (const cb of this.activeCallbacks) {
      cb();
    }
  }
}

describe('Simulation Engine', () => {
  let clock: TestClock;
  let scheduler: TestScheduler;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
    clock = new TestClock();
    scheduler = new TestScheduler();
  });

  it('is idempotent: calling start() twice creates exactly 1 timer', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(123),
    });

    expect(engine.getTimerCount()).toBe(0);

    engine.start();
    expect(engine.getTimerCount()).toBe(1);

    // Call start a second time
    engine.start();
    expect(engine.getTimerCount()).toBe(1); // Still 1!
  });

  it('stops cleanly and restores timer count to 0', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(123),
    });

    engine.start();
    expect(engine.getTimerCount()).toBe(1);

    engine.stop();
    expect(engine.getTimerCount()).toBe(0);
    expect(useStore.getState().running).toBe(false);
  });

  it('handles start, stop, start correctly (Strict Mode lifecycle resilience)', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(123),
    });

    engine.start();
    expect(engine.getTimerCount()).toBe(1);

    engine.stop();
    expect(engine.getTimerCount()).toBe(0);

    engine.start();
    expect(engine.getTimerCount()).toBe(1);
  });

  it('generates identical output for the same seed and same sequence of steps', () => {
    useStore.getState().setVirtualTime(1730476800000);
    const engine1 = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(999),
    });

    const readings1 = [];
    for (let i = 0; i < 20; i++) {
      readings1.push(engine1.step(1000));
    }

    // Reset store and run engine 2 with same seed and same virtual baseline
    useStore.getState().resetToDefaults();
    useStore.getState().setVirtualTime(1730476800000);
    const engine2 = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(999),
    });

    const readings2 = [];
    for (let i = 0; i < 20; i++) {
      readings2.push(engine2.step(1000));
    }

    expect(readings1).toEqual(readings2);
  });

  it('advances virtual time according to speed multiplier without changing tick interval', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(42),
      tickIntervalMs: 1000,
    });

    const initialTime = useStore.getState().virtualTime;

    // At speed 1, 1000ms real tick advances 1000ms virtual
    engine.setSpeed(1);
    engine.start();
    scheduler.triggerTick();
    expect(useStore.getState().virtualTime).toBe(initialTime + 1000);

    // At speed 5, 1000ms real tick advances 5000ms virtual
    engine.setSpeed(5);
    scheduler.triggerTick();
    expect(useStore.getState().virtualTime).toBe(initialTime + 1000 + 5000);

    // At speed 10, advances 10000ms virtual
    engine.setSpeed(10);
    scheduler.triggerTick();
    expect(useStore.getState().virtualTime).toBe(initialTime + 6000 + 10000);
  });

  it('ensures total watts strictly equals the sum of powerWatts of online devices', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(777),
    });

    for (let i = 0; i < 50; i++) {
      const telemetry = engine.step(1000);
      const devices = useStore.getState().devices;
      const expectedTotal = devices
        .filter((d) => d.online)
        .reduce((sum, d) => sum + d.powerWatts, 0);

      expect(telemetry.totalWatts).toBe(expectedTotal);
    }
  });

  it('subscribes to telemetry readings and unsubscribe removes listener', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(111),
    });

    let receivedCount = 0;
    const unsubscribe = engine.subscribe(() => {
      receivedCount++;
    });

    engine.step(1000);
    expect(receivedCount).toBe(1);

    engine.step(1000);
    expect(receivedCount).toBe(2);

    unsubscribe();
    engine.step(1000);
    // After unsubscribe, count does not increment
    expect(receivedCount).toBe(2);
  });

  it('reproducibly generates anomalies on identical steps', () => {
    const engine1 = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(555),
    });

    for (let i = 0; i < 250; i++) {
      engine1.step(1000);
    }
    const anomalies1 = [...useStore.getState().anomalies];

    // Reset store and run with same PRNG seed
    useStore.getState().resetToDefaults();
    const engine2 = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(555),
    });

    for (let i = 0; i < 250; i++) {
      engine2.step(1000);
    }
    const anomalies2 = [...useStore.getState().anomalies];

    expect(anomalies1).toEqual(anomalies2);
  });

  it('keeps all values in realistic valid ranges with zero NaN over 10,000 steps', () => {
    const engine = new SimulationEngine({
      store: useStore,
      clock,
      scheduler,
      prng: new PRNG(888),
    });

    for (let i = 0; i < 10000; i++) {
      const reading = engine.step(1000);
      expect(Number.isNaN(reading.totalWatts)).toBe(false);
      expect(reading.totalWatts).toBeGreaterThanOrEqual(0);
      expect(reading.totalWatts).toBeLessThan(15000); // Realistic residential cap
    }

    const finalRooms = useStore.getState().rooms;
    for (const r of finalRooms) {
      expect(Number.isNaN(r.ambientTemp!)).toBe(false);
      expect(r.ambientTemp!).toBeGreaterThanOrEqual(10);
      expect(r.ambientTemp!).toBeLessThanOrEqual(40);

      expect(Number.isNaN(r.ambientHumidity!)).toBe(false);
      expect(r.ambientHumidity!).toBeGreaterThanOrEqual(20);
      expect(r.ambientHumidity!).toBeLessThanOrEqual(80);
    }
  });
});
