/**
 * Energy Analytics Engine & Anomaly Detector.
 * Pure TypeScript. Zero React imports.
 *
 * Provides:
 * - Statistical anomaly detection using rolling baselines (mean, standard deviation, z-score threshold).
 * - Multi-range aggregation (1h, 24h, 7d, 30d, custom) with per-bucket power averaging and kWh integration.
 * - Per-device and per-room breakdown where components strictly sum to total kWh.
 * - Seeded deterministic demo history generator with reproducible anomalies labeled for evaluation.
 */

import type { LivePowerReading, EnergyTimeRange, Device, Room } from '@/types';
import { Mulberry32 } from '@/utils/prng';

// ============================================================================
// 1. STATISTICAL ANOMALY DETECTION
// ============================================================================

export type AnomalyMetric = 'watts' | 'temperature' | 'humidity' | 'custom';

/**
 * Standard deviation floors per metric to avoid false positives on low-noise signals.
 * - watts: 10.0 W (ignores minor micro-watt fluctuations)
 * - temperature: 0.5 °C (ignores 0.1°C sensor jitter)
 * - humidity: 1.0 % (ignores minor ambient humidity drift)
 * - custom: 1.0
 */
export const DEFAULT_STD_FLOORS: Record<AnomalyMetric, number> = {
  watts: 10.0,
  temperature: 0.5,
  humidity: 1.0,
  custom: 1.0,
};

export interface AnomalyDetectionOptions {
  /** Rolling window size in historical points (default: 24) */
  window?: number;
  /** Minimum samples required in window before evaluating a point (default: 8) */
  minSamples?: number;
  /** Standard deviation multiplier threshold (default: 3) */
  k?: number;
  /** Metric type to apply appropriate default standard deviation floor (default: 'watts') */
  metric?: AnomalyMetric;
  /** Explicit standard deviation floor (overrides per-metric default if specified) */
  stdFloor?: number;
}

export interface DetectedAnomaly {
  timestamp: number;
  value: number;
  baseline: number;
  threshold: number;
  zScore: number;
}

/**
 * Detects power spikes using a rolling Gaussian baseline.
 *
 * Algorithm:
 * - For each point i, calculates rolling mean and std over previous window N points [i-window, i).
 * - The point being evaluated is EXCLUDED from its own baseline calculation.
 * - If available previous history < minSamples, point is never flagged (insufficient history).
 * - Standard deviation is clamped to a minimum floor (stdFloor) to avoid 0/0 and false positives on flat series.
 * - Flags anomalies where value > (mean + k * effectiveStd).
 */
export function detectAnomalies(
  series: Array<{ timestamp: number; value: number }>,
  options: AnomalyDetectionOptions = {}
): DetectedAnomaly[] {
  const window = options.window ?? 24;
  const minSamples = options.minSamples ?? 8;
  const k = options.k ?? 3;
  const metric = options.metric ?? 'watts';
  const stdFloor = options.stdFloor ?? (DEFAULT_STD_FLOORS[metric] ?? 1.0);

  const anomalies: DetectedAnomaly[] = [];

  for (let i = 0; i < series.length; i++) {
    const current = series[i];
    if (!current) continue;

    // Previous window points (point i strictly excluded)
    const startIdx = Math.max(0, i - window);
    const windowPoints = series.slice(startIdx, i);

    // Skip if not enough history to establish a reliable baseline
    if (windowPoints.length < minSamples) {
      continue;
    }

    const values = windowPoints.map((p) => p.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = sum / values.length;

    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
    const rawStd = Math.sqrt(variance);
    const effectiveStd = Math.max(rawStd, stdFloor);

    const threshold = mean + k * effectiveStd;

    if (current.value > threshold) {
      const zScore = (current.value - mean) / effectiveStd;
      anomalies.push({
        timestamp: current.timestamp,
        value: current.value,
        baseline: roundDecimals(mean, 2),
        threshold: roundDecimals(threshold, 2),
        zScore: roundDecimals(zScore, 2),
      });
    }
  }

  return anomalies;
}

// ============================================================================
// 2. ENERGY AGGREGATION & BUCKETING
// ============================================================================

/**
 * BUCKET CONFIGURATION DOCUMENTATION:
 * - '1h': 1-hour window. Bucket size = 1 minute (60,000 ms). Total 60 buckets.
 * - '24h': 24-hour window. Bucket size = 1 hour (3,600,000 ms). Total 24 buckets.
 * - '7d': 7-day window. Bucket size = 1 day (86,400,000 ms). Total 7 buckets.
 * - '30d': 30-day window. Bucket size = 1 day (86,400,000 ms). Total 30 buckets.
 * - 'custom': Custom range [start, end].
 *     Duration <= 2 hours  -> 1 minute (60,000 ms)
 *     Duration <= 48 hours -> 1 hour (3,600,000 ms)
 *     Otherwise            -> 1 day (86,400,000 ms)
 */

export interface EnergyBucket {
  timestamp: number;
  durationMs: number;
  averageWatts: number;
  peakWatts: number;
  kWh: number;
  deviceWatts: Record<string, number>;
  deviceKWh: Record<string, number>;
  roomWatts: Record<string, number>;
  roomKWh: Record<string, number>;
  sampleCount: number;
}

export interface EnergySummary {
  totalKWh: number;
  peakWatts: number;
  averageWatts: number;
  deviceKWh: Record<string, number>;
  roomKWh: Record<string, number>;
}

export interface AggregatedEnergyResult {
  status: 'ok' | 'insufficient_data';
  range: EnergyTimeRange;
  bucketSizeMs: number;
  bucketCount: number;
  startTime: number;
  endTime: number;
  buckets: EnergyBucket[];
  summary: EnergySummary;
}

export interface CustomDateRange {
  start: number;
  end: number;
}

/**
 * Aggregates high-frequency power telemetry into discrete time buckets.
 *
 * Calculations:
 * - Bucket average W = sum(totalWatts in bucket) / sampleCount
 * - Bucket Energy kWh = (average W * bucketHours) / 1000
 * - Per-device and per-room kWh are calculated identically from respective average W.
 * - Mathematical guarantee: Sum of device kWh === total kWh and sum of room kWh === total kWh.
 */
export function aggregateEnergy(
  readings: LivePowerReading[],
  range: EnergyTimeRange,
  now: number,
  customRange?: CustomDateRange
): AggregatedEnergyResult {
  let startTime = 0;
  let endTime = now;
  let bucketSizeMs = 0;
  let bucketCount = 0;

  switch (range) {
    case '1h': {
      bucketSizeMs = 60 * 1000; // 1 minute
      bucketCount = 60;
      startTime = now - 60 * 60 * 1000;
      endTime = now;
      break;
    }
    case '24h': {
      bucketSizeMs = 3600 * 1000; // 1 hour
      bucketCount = 24;
      startTime = now - 24 * 3600 * 1000;
      endTime = now;
      break;
    }
    case '7d': {
      bucketSizeMs = 24 * 3600 * 1000; // 1 day
      bucketCount = 7;
      startTime = now - 7 * 24 * 3600 * 1000;
      endTime = now;
      break;
    }
    case '30d': {
      bucketSizeMs = 24 * 3600 * 1000; // 1 day
      bucketCount = 30;
      startTime = now - 30 * 24 * 3600 * 1000;
      endTime = now;
      break;
    }
    case 'custom': {
      if (!customRange || customRange.end <= customRange.start) {
        return createEmptyResult('custom', 0, 0, 0, 0);
      }
      startTime = customRange.start;
      endTime = customRange.end;
      const durationMs = endTime - startTime;

      if (durationMs <= 2 * 3600 * 1000) {
        bucketSizeMs = 60 * 1000; // 1 minute
      } else if (durationMs <= 48 * 3600 * 1000) {
        bucketSizeMs = 3600 * 1000; // 1 hour
      } else {
        bucketSizeMs = 24 * 3600 * 1000; // 1 day
      }
      bucketCount = Math.max(1, Math.ceil(durationMs / bucketSizeMs));
      break;
    }
  }

  // Filter readings that fall strictly within [startTime, endTime)
  const inRangeReadings = readings.filter(
    (r) => r.timestamp >= startTime && r.timestamp <= endTime
  );

  if (inRangeReadings.length === 0) {
    return createEmptyResult(
      range,
      startTime,
      endTime,
      bucketSizeMs,
      bucketCount
    );
  }

  // Pre-collect unique device IDs and room IDs across all readings
  const allDeviceIds = new Set<string>();
  const allRoomIds = new Set<string>();
  for (const r of inRangeReadings) {
    for (const dId of Object.keys(r.deviceWatts)) allDeviceIds.add(dId);
    for (const rId of Object.keys(r.roomWatts)) allRoomIds.add(rId);
  }

  const buckets: EnergyBucket[] = [];
  const summaryDeviceKWh: Record<string, number> = {};
  const summaryRoomKWh: Record<string, number> = {};
  for (const dId of allDeviceIds) summaryDeviceKWh[dId] = 0;
  for (const rId of allRoomIds) summaryRoomKWh[rId] = 0;

  let totalWattsAccumulator = 0;
  let totalSamplesCount = 0;
  let peakWatts = 0;

  for (let b = 0; b < bucketCount; b++) {
    const bucketStart = startTime + b * bucketSizeMs;
    const bucketEnd = bucketStart + bucketSizeMs;
    const bucketHours = bucketSizeMs / (3600 * 1000);

    const bucketReadings = inRangeReadings.filter(
      (r) => r.timestamp >= bucketStart && r.timestamp < bucketEnd
    );

    const sampleCount = bucketReadings.length;
    let avgWatts = 0;
    let bucketPeakWatts = 0;
    const devWatts: Record<string, number> = {};
    const devKWh: Record<string, number> = {};
    const rmWatts: Record<string, number> = {};
    const rmKWh: Record<string, number> = {};

    for (const dId of allDeviceIds) {
      devWatts[dId] = 0;
      devKWh[dId] = 0;
    }
    for (const rId of allRoomIds) {
      rmWatts[rId] = 0;
      rmKWh[rId] = 0;
    }

    if (sampleCount > 0) {
      let bucketWattsSum = 0;
      for (const r of bucketReadings) {
        bucketWattsSum += r.totalWatts;
        totalWattsAccumulator += r.totalWatts;
        totalSamplesCount++;
        if (r.totalWatts > bucketPeakWatts) bucketPeakWatts = r.totalWatts;
        if (r.totalWatts > peakWatts) peakWatts = r.totalWatts;

        for (const [dId, w] of Object.entries(r.deviceWatts)) {
          devWatts[dId] = (devWatts[dId] ?? 0) + w;
        }
        for (const [rId, w] of Object.entries(r.roomWatts)) {
          rmWatts[rId] = (rmWatts[rId] ?? 0) + w;
        }
      }

      avgWatts = bucketWattsSum / sampleCount;

      for (const dId of allDeviceIds) {
        const avgDevWatt = (devWatts[dId] ?? 0) / sampleCount;
        devWatts[dId] = roundDecimals(avgDevWatt, 2);
        const kwh = (avgDevWatt * bucketHours) / 1000;
        devKWh[dId] = kwh;
        summaryDeviceKWh[dId] = (summaryDeviceKWh[dId] ?? 0) + kwh;
      }

      for (const rId of allRoomIds) {
        const avgRmWatt = (rmWatts[rId] ?? 0) / sampleCount;
        rmWatts[rId] = roundDecimals(avgRmWatt, 2);
        const kwh = (avgRmWatt * bucketHours) / 1000;
        rmKWh[rId] = kwh;
        summaryRoomKWh[rId] = (summaryRoomKWh[rId] ?? 0) + kwh;
      }
    }

    const bucketKWh = (avgWatts * bucketHours) / 1000;

    buckets.push({
      timestamp: bucketStart,
      durationMs: bucketSizeMs,
      averageWatts: roundDecimals(avgWatts, 2),
      peakWatts: roundDecimals(bucketPeakWatts, 2),
      kWh: roundDecimals(bucketKWh, 4),
      deviceWatts: devWatts,
      deviceKWh: Object.fromEntries(
        Object.entries(devKWh).map(([k, v]) => [k, roundDecimals(v, 4)])
      ),
      roomWatts: rmWatts,
      roomKWh: Object.fromEntries(
        Object.entries(rmKWh).map(([k, v]) => [k, roundDecimals(v, 4)])
      ),
      sampleCount,
    });
  }

  // Calculate clean rounded summary
  const totalKWh = buckets.reduce((acc, b) => acc + b.kWh, 0);
  const averageWatts =
    totalSamplesCount > 0 ? totalWattsAccumulator / totalSamplesCount : 0;

  // Round summary breakdowns
  const roundedDeviceKWh: Record<string, number> = {};
  for (const [dId, val] of Object.entries(summaryDeviceKWh)) {
    roundedDeviceKWh[dId] = roundDecimals(val, 4);
  }

  const roundedRoomKWh: Record<string, number> = {};
  for (const [rId, val] of Object.entries(summaryRoomKWh)) {
    roundedRoomKWh[rId] = roundDecimals(val, 4);
  }

  return {
    status: 'ok',
    range,
    bucketSizeMs,
    bucketCount,
    startTime,
    endTime,
    buckets,
    summary: {
      totalKWh: roundDecimals(totalKWh, 4),
      peakWatts: roundDecimals(peakWatts, 2),
      averageWatts: roundDecimals(averageWatts, 2),
      deviceKWh: roundedDeviceKWh,
      roomKWh: roundedRoomKWh,
    },
  };
}

function createEmptyResult(
  range: EnergyTimeRange,
  startTime: number,
  endTime: number,
  bucketSizeMs: number,
  bucketCount: number
): AggregatedEnergyResult {
  return {
    status: 'insufficient_data',
    range,
    bucketSizeMs,
    bucketCount,
    startTime,
    endTime,
    buckets: [],
    summary: {
      totalKWh: 0,
      peakWatts: 0,
      averageWatts: 0,
      deviceKWh: {},
      roomKWh: {},
    },
  };
}

function roundDecimals(val: number, decimals: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

// ============================================================================
// 3. DETERMINISTIC SEEDED DEMO HISTORY GENERATOR
// ============================================================================

export const DEMO_ENERGY_LABEL = 'DEMO_ENERGY_ANALYTICS';

export interface DemoAnomalySpec {
  offsetHours: number;
  deviceId: string;
  roomId: string;
  spikeWatts: number;
  description: string;
}

/** Predefined known reproducible anomalies for evaluation */
export const DEMO_KNOWN_ANOMALIES: DemoAnomalySpec[] = [
  {
    offsetHours: 6,
    deviceId: 'dev-outlet-heater',
    roomId: 'room-living',
    spikeWatts: 2400,
    description: 'Space Heater surge in Living Room',
  },
  {
    offsetHours: 18,
    deviceId: 'dev-therm-living',
    roomId: 'room-living',
    spikeWatts: 1800,
    description: 'HVAC compressor fault spike',
  },
];

/**
 * Generates a deterministic historical energy series consistent with device models,
 * baseline diurnal cycles, and known reproducible anomalies.
 */
export function generateDemoEnergyHistory(
  seed: number,
  startTime: number,
  endTime: number,
  stepMs = 60 * 1000,
  devices?: Device[],
  rooms?: Room[]
): LivePowerReading[] {
  const prng = new Mulberry32(seed);
  const readings: LivePowerReading[] = [];

  // Default fallback devices if none provided
  const activeDevices = devices ?? [
    { id: 'dev-light-living', roomId: 'room-living', powerWatts: 60 },
    { id: 'dev-therm-living', roomId: 'room-living', powerWatts: 380 },
    { id: 'dev-outlet-heater', roomId: 'room-living', powerWatts: 0 },
    { id: 'dev-light-bed', roomId: 'room-bedroom', powerWatts: 40 },
    { id: 'dev-tv-bed', roomId: 'room-bedroom', powerWatts: 120 },
  ];

  const activeRooms = rooms ?? [
    { id: 'room-living', name: 'Living Room' },
    { id: 'room-bedroom', name: 'Bedroom' },
  ];

  // Map known anomalies to exact timestamps
  const anomalyMap = new Map<number, DemoAnomalySpec>();
  for (const anom of DEMO_KNOWN_ANOMALIES) {
    const targetTimestamp = startTime + anom.offsetHours * 3600 * 1000;
    // Align to stepMs
    const alignedTime =
      Math.round((targetTimestamp - startTime) / stepMs) * stepMs + startTime;
    anomalyMap.set(alignedTime, anom);
  }

  for (let t = startTime; t <= endTime; t += stepMs) {
    const date = new Date(t);
    const hour = date.getHours() + date.getMinutes() / 60;

    // Diurnal factor: higher during waking evening hours (18:00 - 22:00), lowest overnight (02:00 - 05:00)
    const diurnalFactor = 0.7 + 0.5 * Math.sin(((hour - 6) / 24) * 2 * Math.PI);

    let totalWatts = 0;
    const deviceWatts: Record<string, number> = {};
    const roomWatts: Record<string, number> = {};

    for (const r of activeRooms) {
      roomWatts[r.id] = 0;
    }

    for (const dev of activeDevices) {
      const baseWatts = dev.powerWatts ?? 50;
      // Small +/- 5% noise per point
      const noise = prng.float(-0.05, 0.05);
      let devPower = baseWatts > 0 ? baseWatts * (diurnalFactor + noise) : 0;

      // Check for known injected anomaly at this timestamp
      const injectedAnomaly = anomalyMap.get(t);
      if (injectedAnomaly && injectedAnomaly.deviceId === dev.id) {
        devPower += injectedAnomaly.spikeWatts;
      }

      devPower = Math.max(0, roundDecimals(devPower, 2));
      deviceWatts[dev.id] = devPower;
      totalWatts += devPower;

      const rId = dev.roomId ?? 'room-living';
      roomWatts[rId] = roundDecimals((roomWatts[rId] ?? 0) + devPower, 2);
    }

    readings.push({
      timestamp: t,
      totalWatts: roundDecimals(totalWatts, 2),
      roomWatts,
      deviceWatts,
    });
  }

  return readings;
}

