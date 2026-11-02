import { describe, it, expect } from 'vitest';
import {
  detectAnomalies,
  aggregateEnergy,
  generateDemoEnergyHistory,
  DEMO_ENERGY_LABEL,
  DEMO_KNOWN_ANOMALIES,
} from '@/engine/energy';
import type { LivePowerReading } from '@/types';

describe('Energy Analytics Engine', () => {
  const baseTime = 1730476800000; // Monday 2024-11-01 16:00:00 UTC

  describe('Statistical Anomaly Detection (detectAnomalies)', () => {
    it('normal series none: flags no anomalies on standard fluctuating series', () => {
      // 50 points hovering tightly around 100W (+/- 5W)
      const series = Array.from({ length: 50 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: 100 + (i % 5) - 2, // 98, 99, 100, 101, 102
      }));

      const anomalies = detectAnomalies(series, { window: 24, minSamples: 8, k: 3 });
      expect(anomalies).toHaveLength(0);
    });

    it('known spike found: reliably detects an injected high-power anomaly', () => {
      // 30 normal baseline points around 100W, then a 600W spike at index 25
      const series = Array.from({ length: 30 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: i === 25 ? 600 : 100 + (i % 3),
      }));

      const anomalies = detectAnomalies(series, { window: 24, minSamples: 8, k: 3 });
      expect(anomalies.length).toBeGreaterThanOrEqual(1);

      const found = anomalies.find((a) => a.value === 600);
      expect(found).toBeDefined();
      expect(found?.timestamp).toBe(baseTime + 25 * 60000);
      expect(found?.baseline).toBeCloseTo(101, 0);
      expect(found?.threshold).toBeLessThan(600);
    });

    it('too little history none: never flags when series length is below minSamples', () => {
      // Series of only 5 points with an extreme spike, but minSamples is 8
      const series = [
        { timestamp: baseTime, value: 100 },
        { timestamp: baseTime + 60000, value: 100 },
        { timestamp: baseTime + 120000, value: 100 },
        { timestamp: baseTime + 180000, value: 100 },
        { timestamp: baseTime + 240000, value: 5000 },
      ];

      const anomalies = detectAnomalies(series, { window: 24, minSamples: 8, k: 3 });
      expect(anomalies).toHaveLength(0);
    });

    it('constant series no divide-by-zero: handles zero variance without NaN or errors', () => {
      // Flat series where std = 0
      const series = Array.from({ length: 40 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: 250,
      }));

      const anomalies = detectAnomalies(series, {
        window: 24,
        minSamples: 8,
        k: 3,
        stdFloor: 1.0,
      });

      expect(anomalies).toHaveLength(0);
      for (const a of anomalies) {
        expect(isNaN(a.threshold)).toBe(false);
        expect(isNaN(a.baseline)).toBe(false);
      }
    });

    it('first points never flagged: points prior to minSamples history are never marked', () => {
      // Point 2 is a massive 2000W spike, but comes at index 2 (history < 8)
      const series = Array.from({ length: 30 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: i === 2 ? 2000 : 100,
      }));

      const anomalies = detectAnomalies(series, { window: 24, minSamples: 8, k: 3 });
      // Point at index 2 cannot be flagged due to minSamples = 8
      const earlySpike = anomalies.find((a) => a.timestamp === baseTime + 2 * 60000);
      expect(earlySpike).toBeUndefined();
    });

    it('applies per-metric stdFloor defaults for watts, temperature, and humidity', () => {
      // 1. Temperature: flat 21.0°C series, spike to 23.0°C (> 21.0 + 3 * 0.5 = 22.5)
      const tempSeries = Array.from({ length: 20 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: i === 15 ? 23.0 : 21.0,
      }));
      const tempAnomalies = detectAnomalies(tempSeries, { metric: 'temperature', k: 3 });
      expect(tempAnomalies.length).toBe(1);
      expect(tempAnomalies[0]?.value).toBe(23.0);
      expect(tempAnomalies[0]?.threshold).toBe(22.5);

      // 2. Humidity: flat 45% series, 47% is below threshold (45 + 3 * 1.0 = 48), 50% is above
      const humSeries = Array.from({ length: 20 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: i === 15 ? 50.0 : 45.0,
      }));
      const humAnomalies = detectAnomalies(humSeries, { metric: 'humidity', k: 3 });
      expect(humAnomalies.length).toBe(1);
      expect(humAnomalies[0]?.value).toBe(50.0);
      expect(humAnomalies[0]?.threshold).toBe(48.0);

      // 3. Watts: flat 100W series, 115W is below threshold (100 + 3 * 10 = 130), 150W is above
      const wattSeries = Array.from({ length: 20 }, (_, i) => ({
        timestamp: baseTime + i * 60000,
        value: i === 15 ? 150.0 : 100.0,
      }));
      const wattAnomalies = detectAnomalies(wattSeries, { metric: 'watts', k: 3 });
      expect(wattAnomalies.length).toBe(1);
      expect(wattAnomalies[0]?.value).toBe(150.0);
      expect(wattAnomalies[0]?.threshold).toBe(130.0);
    });
  });

  describe('Energy Aggregation (aggregateEnergy)', () => {
    // Generate 24 hours of synthetic 1-minute readings
    const dayStart = baseTime - 24 * 3600 * 1000;
    const testReadings: LivePowerReading[] = [];

    for (let t = dayStart; t <= baseTime; t += 60 * 1000) {
      testReadings.push({
        timestamp: t,
        totalWatts: 300,
        deviceWatts: {
          'dev-1': 100,
          'dev-2': 200,
        },
        roomWatts: {
          'room-living': 100,
          'room-bed': 200,
        },
      });
    }

    it('range changes bucket count and totals across 1h, 24h, 7d, 30d', () => {
      const res1h = aggregateEnergy(testReadings, '1h', baseTime);
      expect(res1h.range).toBe('1h');
      expect(res1h.bucketCount).toBe(60);
      expect(res1h.buckets.length).toBe(60);

      const res24h = aggregateEnergy(testReadings, '24h', baseTime);
      expect(res24h.range).toBe('24h');
      expect(res24h.bucketCount).toBe(24);
      expect(res24h.buckets.length).toBe(24);
      expect(res24h.summary.totalKWh).toBeGreaterThan(res1h.summary.totalKWh);

      const res7d = aggregateEnergy(testReadings, '7d', baseTime);
      expect(res7d.range).toBe('7d');
      expect(res7d.bucketCount).toBe(7);

      const res30d = aggregateEnergy(testReadings, '30d', baseTime);
      expect(res30d.range).toBe('30d');
      expect(res30d.bucketCount).toBe(30);
    });

    it('sum of device kWh equals total within aggregation summary', () => {
      const res = aggregateEnergy(testReadings, '24h', baseTime);
      expect(res.status).toBe('ok');

      const sumDeviceKWh = Object.values(res.summary.deviceKWh).reduce(
        (acc, val) => acc + val,
        0
      );

      // Verify mathematical equality
      expect(sumDeviceKWh).toBeCloseTo(res.summary.totalKWh, 3);
    });

    it('sum of room kWh equals total within aggregation summary', () => {
      const res = aggregateEnergy(testReadings, '24h', baseTime);
      expect(res.status).toBe('ok');

      const sumRoomKWh = Object.values(res.summary.roomKWh).reduce(
        (acc, val) => acc + val,
        0
      );

      // Verify mathematical equality
      expect(sumRoomKWh).toBeCloseTo(res.summary.totalKWh, 3);
    });

    it('custom range aggregates accurately based on arbitrary boundaries', () => {
      const customStart = baseTime - 4 * 3600 * 1000; // 4 hours ago
      const customEnd = baseTime - 1 * 3600 * 1000;   // 1 hour ago

      const res = aggregateEnergy(testReadings, 'custom', baseTime, {
        start: customStart,
        end: customEnd,
      });

      expect(res.status).toBe('ok');
      expect(res.range).toBe('custom');
      expect(res.startTime).toBe(customStart);
      expect(res.endTime).toBe(customEnd);
      // Duration is 3 hours <= 48 hours, so bucket size is 1 hour = 3 buckets
      expect(res.bucketCount).toBe(3);
      expect(res.summary.totalKWh).toBeGreaterThan(0);
    });

    it('empty range returns an insufficient-data state, not NaN', () => {
      const emptyResult = aggregateEnergy([], '24h', baseTime);

      expect(emptyResult.status).toBe('insufficient_data');
      expect(emptyResult.buckets).toHaveLength(0);
      expect(emptyResult.summary.totalKWh).toBe(0);
      expect(emptyResult.summary.averageWatts).toBe(0);
      expect(emptyResult.summary.peakWatts).toBe(0);
      expect(isNaN(emptyResult.summary.totalKWh)).toBe(false);
      expect(isNaN(emptyResult.summary.averageWatts)).toBe(false);
      expect(isNaN(emptyResult.summary.peakWatts)).toBe(false);
    });
  });

  describe('Seeded Demo History Generator', () => {
    it('generates deterministic history tagged with DEMO label', () => {
      expect(DEMO_ENERGY_LABEL).toBe('DEMO_ENERGY_ANALYTICS');
      expect(DEMO_KNOWN_ANOMALIES.length).toBeGreaterThanOrEqual(1);

      const historyA = generateDemoEnergyHistory(
        999,
        baseTime - 24 * 3600 * 1000,
        baseTime,
        15 * 60 * 1000
      );
      const historyB = generateDemoEnergyHistory(
        999,
        baseTime - 24 * 3600 * 1000,
        baseTime,
        15 * 60 * 1000
      );

      expect(historyA).toEqual(historyB);
      expect(historyA.length).toBeGreaterThan(0);

      // Verify power sum integrity: totalWatts equals sum of deviceWatts
      for (const reading of historyA) {
        const sumDev = Object.values(reading.deviceWatts).reduce((a, b) => a + b, 0);
        expect(reading.totalWatts).toBeCloseTo(sumDev, 1);
      }
    });

    it('contains known reproducible anomalies that can be detected', () => {
      const start = baseTime - 24 * 3600 * 1000;
      const history = generateDemoEnergyHistory(
        42,
        start,
        baseTime,
        5 * 60 * 1000 // 5-minute ticks
      );

      const series = history.map((h) => ({ timestamp: h.timestamp, value: h.totalWatts }));
      const anomalies = detectAnomalies(series, { window: 24, minSamples: 8, k: 3 });

      // Anomaly injected at +6h or +18h should be detected
      expect(anomalies.length).toBeGreaterThanOrEqual(1);
    });
  });
});

