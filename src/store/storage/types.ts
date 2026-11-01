import type {
  Device,
  Rule,
  Schedule,
  Notification,
  SimulationSpeed,
} from '@/types';

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'NESTORA_V1_STATE';
export const THEME_STORAGE_KEY = 'nestora_theme';

export interface PersistedSimulationConfig {
  speed: SimulationSpeed;
  seed: number;
  failNextCommand: boolean;
  failureProbability: number;
}

export interface PersistedStateV1 {
  version: 1;
  devices: Device[];
  rules: Rule[];
  schedules: Schedule[];
  notifications: Notification[];
  simulation: PersistedSimulationConfig;
  theme: 'light' | 'dark';
}

