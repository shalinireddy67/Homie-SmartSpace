import type {
  Device,
  Rule,
  Schedule,
  Notification,
  NotificationSettings,
  SimulationSpeed,
} from '@/types';
import {
  APP_STATE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
} from '@/constants/branding';

export const CURRENT_SCHEMA_VERSION = 1;

/** Current active storage keys derived from branding constants */
export const STORAGE_KEY = APP_STATE_STORAGE_KEY; // 'HOMIE_SMARTSPACE_V1_STATE'
export const THEME_STORAGE_KEY = APP_THEME_STORAGE_KEY; // 'homie_smartspace_theme'

/** Legacy storage keys supported for automatic one-time migration */
export const LEGACY_STORAGE_KEYS = [
  'HOMIE_V1_STATE',
  'NESTORA_V1_STATE',
] as const;

export const LEGACY_THEME_KEYS = [
  'homie_theme',
  'nestora_theme',
] as const;

export interface PersistedSimulationConfig {
  speed: SimulationSpeed;
  seed: number;
  failNextCommand: boolean;
  failureProbability: number;
  acceleratedDemo?: boolean;
}

export interface PersistedStateV1 {
  version: 1;
  devices: Device[];
  rules: Rule[];
  schedules: Schedule[];
  notifications: Notification[];
  notificationSettings?: NotificationSettings;
  simulation: PersistedSimulationConfig;
  theme: 'light' | 'dark' | 'system';
}
