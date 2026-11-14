import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store';
import { createRuntime } from '@/engine/runtime';
import { MAX_LIVE_TELEMETRY_POINTS } from '@/store/slices/energySlice';
import { MAX_EVENT_BUFFER } from '@/store/slices/eventSlice';

describe('Bounded Memory & Simulation Stability (3,000 Steps at 10x)', () => {
  beforeEach(() => {
    useStore.getState().resetToDefaults();
  });

  it('maintains strictly bounded memory and ring buffers over 3,000 steps', async () => {
    let mockTime = Date.now();
    const runtime = createRuntime({
      store: useStore,
      clock: { now: () => mockTime },
      scheduler: {
        delay: () => Promise.resolve(),
        setInterval: () => 1,
        clearInterval: () => {},
      },
    });

    useStore.getState().setSpeed(10);
    runtime.initDemoEnergy();

    // Execute 3,000 full simulation steps
    for (let i = 0; i < 3000; i++) {
      mockTime += 1000;
      await runtime.step(1000);
    }

    const state = useStore.getState();

    // Verify telemetry ring buffer is strictly capped at MAX_LIVE_TELEMETRY_POINTS
    expect(state.liveTelemetry.length).toBeLessThanOrEqual(MAX_LIVE_TELEMETRY_POINTS);

    // Verify events buffer is strictly capped at MAX_EVENT_BUFFER
    expect(state.events.length).toBeLessThanOrEqual(MAX_EVENT_BUFFER);

    // Verify no NaNs in telemetry or device readings
    for (const reading of state.liveTelemetry) {
      expect(Number.isNaN(reading.totalWatts)).toBe(false);
    }

    for (const dev of state.devices) {
      if (dev.type === 'thermostat') {
        expect(Number.isNaN(dev.current)).toBe(false);
        expect(Number.isNaN(dev.target)).toBe(false);
      }
    }
  });
});
