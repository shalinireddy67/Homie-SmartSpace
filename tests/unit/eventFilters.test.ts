import { describe, it, expect, beforeAll } from 'vitest';
import {
  filterEvents,
  sortEvents,
  indexEventsForSearch,
  type IndexedLogEvent,
} from '@/engine/eventFilters';
import { generateSeedData } from '@/utils/seedData';
import type { LogEvent } from '@/types';

describe('Event Filter & Sorting Engine', () => {
  const anchorTime = 1730476800000;
  let rawEvents: LogEvent[];
  let indexedEvents: IndexedLogEvent[];
  let deviceNameMap: Record<string, string>;

  beforeAll(() => {
    // Generate real 10,000 seeded events
    const seed = generateSeedData(42, anchorTime);
    rawEvents = seed.events;
    expect(rawEvents.length).toBe(10000);

    deviceNameMap = {};
    for (const d of seed.devices) {
      deviceNameMap[d.id] = d.name;
    }

    // Precompute lowercase search index once
    const indexStart = performance.now();
    indexedEvents = indexEventsForSearch(rawEvents, deviceNameMap);
    const indexDuration = performance.now() - indexStart;
    console.log(`[Benchmark] Precomputed search index for 10,000 events in ${indexDuration.toFixed(2)} ms`);
  });

  it('each single filter equals a manual count: search query', () => {
    const query = 'thermostat';
    const filtered = filterEvents(indexedEvents, { searchQuery: query }, deviceNameMap);

    const manualCount = rawEvents.filter((e) => {
      const devName = e.deviceId ? deviceNameMap[e.deviceId] ?? '' : '';
      const text = `${e.description} ${devName} ${e.type}`.toLowerCase();
      return text.includes(query);
    }).length;

    expect(filtered.length).toBe(manualCount);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('each single filter equals a manual count: event type', () => {
    const filtered = filterEvents(indexedEvents, { types: ['command'] });
    const manualCount = rawEvents.filter((e) => e.type === 'command').length;

    expect(filtered.length).toBe(manualCount);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('each single filter equals a manual count: severity', () => {
    const filtered = filterEvents(indexedEvents, { severities: ['warning'] });
    const manualCount = rawEvents.filter((e) => e.severity === 'warning').length;

    expect(filtered.length).toBe(manualCount);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('each single filter equals a manual count: room', () => {
    const targetRoom = 'room-living';
    const filtered = filterEvents(indexedEvents, { roomId: targetRoom });
    const manualCount = rawEvents.filter((e) => e.roomId === targetRoom).length;

    expect(filtered.length).toBe(manualCount);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('each single filter equals a manual count: device', () => {
    const targetDevice = 'dev-light-living';
    const filtered = filterEvents(indexedEvents, { deviceId: targetDevice });
    const manualCount = rawEvents.filter((e) => e.deviceId === targetDevice).length;

    expect(filtered.length).toBe(manualCount);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('each single filter equals a manual count: date range', () => {
    const start = anchorTime - 7 * 24 * 3600 * 1000;
    const end = anchorTime;

    const filtered = filterEvents(indexedEvents, {
      startDate: start,
      endDate: end,
    });

    const manualCount = rawEvents.filter(
      (e) => e.timestamp >= start && e.timestamp <= end
    ).length;

    expect(filtered.length).toBe(manualCount);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('combined filters: strictly applies logical AND across multiple dimensions', () => {
    const filter = {
      searchQuery: 'light',
      roomId: 'room-living',
      severities: ['info' as const],
      types: ['command' as const],
    };

    const filtered = filterEvents(indexedEvents, filter, deviceNameMap);

    const manualCount = rawEvents.filter((e) => {
      const devName = e.deviceId ? deviceNameMap[e.deviceId] ?? '' : '';
      const text = `${e.description} ${devName} ${e.type}`.toLowerCase();
      return (
        text.includes('light') &&
        e.roomId === 'room-living' &&
        e.severity === 'info' &&
        e.type === 'command'
      );
    }).length;

    expect(filtered.length).toBe(manualCount);
  });

  it('sort both directions: sorts ascending and descending by timestamp', () => {
    const descSorted = sortEvents(indexedEvents, 'desc');
    expect(descSorted.length).toBe(10000);
    for (let i = 0; i < 50; i++) {
      expect(descSorted[i]!.timestamp).toBeGreaterThanOrEqual(descSorted[i + 1]!.timestamp);
    }

    const ascSorted = sortEvents(indexedEvents, 'asc');
    expect(ascSorted.length).toBe(10000);
    for (let i = 0; i < 50; i++) {
      expect(ascSorted[i]!.timestamp).toBeLessThanOrEqual(ascSorted[i + 1]!.timestamp);
    }

    // Verify oldest and newest endpoints
    expect(ascSorted[0]!.timestamp).toBe(descSorted[descSorted.length - 1]!.timestamp);
    expect(ascSorted[ascSorted.length - 1]!.timestamp).toBe(descSorted[0]!.timestamp);
  });

  it('empty result: returns empty array when filter conditions match nothing', () => {
    const filtered = filterEvents(indexedEvents, {
      searchQuery: 'NON_EXISTENT_MAGIC_STRING_12345!@#$',
    });

    expect(filtered).toEqual([]);
    expect(filtered).toHaveLength(0);
  });

  it('clear filters returns all: empty filter object returns all 10,000 events', () => {
    const filtered = filterEvents(indexedEvents, { searchQuery: '' });
    expect(filtered.length).toBe(10000);

    const completelyEmpty = filterEvents(indexedEvents, {});
    expect(completelyEmpty.length).toBe(10000);
  });

  it('benchmark: measures and prints real filter and sort times on 10,000 events', () => {
    // 1. Measure multi-field filter time
    const startFilter = performance.now();
    const filterResult = filterEvents(
      indexedEvents,
      {
        searchQuery: 'temperature',
        types: ['device_state'],
        severities: ['info', 'warning'],
        startDate: anchorTime - 14 * 24 * 3600 * 1000,
        endDate: anchorTime,
      },
      deviceNameMap
    );
    const filterDuration = performance.now() - startFilter;

    // 2. Measure sorting time on 10,000 events
    const startSort = performance.now();
    const sortResult = sortEvents(indexedEvents, 'asc');
    const sortDuration = performance.now() - startSort;

    console.log(`[Benchmark] Filtered 10,000 events down to ${filterResult.length} in ${filterDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] Sorted 10,000 events in ${sortDuration.toFixed(2)} ms`);

    expect(filterDuration).toBeGreaterThan(0);
    expect(sortDuration).toBeGreaterThan(0);
    expect(sortResult.length).toBe(10000);
  });
});

