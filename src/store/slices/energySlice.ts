import { StateCreator } from 'zustand';
import type {
  LivePowerReading,
  EnergyAnomaly,
  EnergyTimeRange,
} from '@/types';

/**
 * Ring buffer limit: 300 telemetry points (equivalent to 5 minutes at 1-second resolution).
 * Prevents memory leak over long simulation runs.
 */
export const MAX_LIVE_TELEMETRY_POINTS = 300;

/** Maximum detected anomalies preserved in memory */
export const MAX_ANOMALIES = 100;

export interface EnergySlice {
  liveTelemetry: LivePowerReading[];
  demoHistory: LivePowerReading[];
  isDemoHistory: boolean;
  anomalies: EnergyAnomaly[];
  selectedTimeRange: EnergyTimeRange;

  setLiveTelemetry: (readings: LivePowerReading[]) => void;
  appendLiveTelemetry: (reading: LivePowerReading) => void;
  setDemoHistory: (readings: LivePowerReading[]) => void;
  addAnomaly: (anomaly: EnergyAnomaly) => void;
  setSelectedTimeRange: (range: EnergyTimeRange) => void;
}

export const createEnergySlice: StateCreator<
  EnergySlice,
  [],
  [],
  EnergySlice
> = (set) => ({
  liveTelemetry: [],
  demoHistory: [],
  isDemoHistory: false,
  anomalies: [],
  selectedTimeRange: '24h',

  setLiveTelemetry: (readings) =>
    set({
      liveTelemetry: readings.slice(-MAX_LIVE_TELEMETRY_POINTS),
    }),

  appendLiveTelemetry: (reading) =>
    set((state) => {
      const next = [...state.liveTelemetry, reading];
      return {
        liveTelemetry:
          next.length > MAX_LIVE_TELEMETRY_POINTS
            ? next.slice(next.length - MAX_LIVE_TELEMETRY_POINTS)
            : next,
      };
    }),

  setDemoHistory: (readings) =>
    set({
      demoHistory: readings,
      isDemoHistory: true,
    }),

  addAnomaly: (anomaly) =>
    set((state) => ({
      anomalies: [anomaly, ...state.anomalies].slice(0, MAX_ANOMALIES),
    })),

  setSelectedTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
});

