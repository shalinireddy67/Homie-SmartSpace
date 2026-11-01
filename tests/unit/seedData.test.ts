import { describe, it, expect } from 'vitest';
import { generateSeedData } from '@/utils/seedData';
import type { LightDevice } from '@/types';

describe('Seed Data Generator', () => {
  const anchorTime = 1730476800000;

  it('generates identical output given the same seed and anchor time', () => {
    const run1 = generateSeedData(4242, anchorTime);
    const run2 = generateSeedData(4242, anchorTime);

    expect(run1.rooms).toEqual(run2.rooms);
    expect(run1.devices).toEqual(run2.devices);
    expect(run1.rules).toEqual(run2.rules);
    expect(run1.schedules).toEqual(run2.schedules);
    expect(run1.events.length).toEqual(run2.events.length);
    expect(run1.events[0]).toEqual(run2.events[0]);
    expect(run1.events[5000]).toEqual(run2.events[5000]);
    expect(run1.events[9999]).toEqual(run2.events[9999]);
  });

  it('generates different event datasets for different seeds', () => {
    const runA = generateSeedData(1001, anchorTime);
    const runB = generateSeedData(2002, anchorTime);

    expect(runA.events[0]?.id).not.toEqual(runB.events[0]?.id);
    expect(runA.events[100]?.description).not.toEqual(runB.events[100]?.description);
  });

  it('generates at least 10,000 events with 100% unique IDs', () => {
    const result = generateSeedData(4242, anchorTime);
    expect(result.events.length).toBeGreaterThanOrEqual(10000);

    const ids = new Set(result.events.map((e) => e.id));
    expect(ids.size).toBe(result.events.length);
  });

  it('sorts all events chronologically by timestamp', () => {
    const result = generateSeedData(4242, anchorTime);

    for (let i = 0; i < result.events.length - 1; i++) {
      const current = result.events[i]!.timestamp;
      const next = result.events[i + 1]!.timestamp;
      expect(current).toBeLessThanOrEqual(next);
    }
  });

  it('configures 5 rooms and devices with >=2 of each type and at least one offline device', () => {
    const result = generateSeedData(4242, anchorTime);

    // 5 rooms
    expect(result.rooms).toHaveLength(5);

    // Count device types
    const typeCounts: Record<string, number> = {};
    for (const d of result.devices) {
      typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1;
    }

    expect(typeCounts['light']).toBeGreaterThanOrEqual(2);
    expect(typeCounts['thermostat']).toBeGreaterThanOrEqual(2);
    expect(typeCounts['lock']).toBeGreaterThanOrEqual(2);
    expect(typeCounts['camera']).toBeGreaterThanOrEqual(2);

    // At least one offline device with offlineReason
    const offlineDevs = result.devices.filter((d) => !d.online);
    expect(offlineDevs.length).toBeGreaterThanOrEqual(1);
    expect(offlineDevs[0]?.offlineReason).toBeDefined();
    expect(offlineDevs[0]?.offlineReason?.length).toBeGreaterThan(0);
  });

  it('ensures off devices draw approximately 0 W power', () => {
    const result = generateSeedData(4242, anchorTime);

    const lights = result.devices.filter((d): d is LightDevice => d.type === 'light');
    const offLights = lights.filter((l) => !l.on);

    expect(offLights.length).toBeGreaterThan(0);
    for (const light of offLights) {
      expect(light.powerWatts).toBe(0);
    }
  });

  it('benchmark: measures seed generation duration for 10,000 events', () => {
    const startTime = performance.now();
    const result = generateSeedData(98765, anchorTime);
    const durationMs = performance.now() - startTime;

    // Real measured duration output (no flaky hard threshold assert)
    console.log(`[Benchmark] Generated ${result.events.length} events in ${durationMs.toFixed(2)} ms`);
    expect(result.events.length).toBe(10000);
    expect(durationMs).toBeGreaterThan(0);
  });
});
