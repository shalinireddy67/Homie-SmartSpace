import type {
  Device,
  LightDevice,
  ThermostatDevice,
  LockDevice,
  CameraDevice,
  Rule,
  Schedule,
  Notification,
  SimulationSpeed,
} from '@/types';
import type { PersistedStateV1, PersistedSimulationConfig } from './types';

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function isValidDevice(val: unknown): val is Device {
  if (!isRecord(val)) return false;
  if (
    typeof val['id'] !== 'string' ||
    typeof val['name'] !== 'string' ||
    typeof val['roomId'] !== 'string' ||
    typeof val['online'] !== 'boolean' ||
    typeof val['updatedAt'] !== 'number' ||
    typeof val['powerWatts'] !== 'number' ||
    typeof val['type'] !== 'string'
  ) {
    return false;
  }

  const type = val['type'];
  if (type === 'light') {
    return (
      typeof (val as unknown as LightDevice)['on'] === 'boolean' &&
      typeof (val as unknown as LightDevice)['brightness'] === 'number' &&
      typeof (val as unknown as LightDevice)['color'] === 'string'
    );
  }
  if (type === 'thermostat') {
    const t = val as unknown as ThermostatDevice;
    return (
      typeof t.current === 'number' &&
      typeof t.target === 'number' &&
      typeof t.min === 'number' &&
      typeof t.max === 'number' &&
      (t.unit === 'F' || t.unit === 'C')
    );
  }
  if (type === 'lock') {
    return typeof (val as unknown as LockDevice)['locked'] === 'boolean';
  }
  if (type === 'camera') {
    const c = val as unknown as CameraDevice;
    return (
      typeof c.active === 'boolean' &&
      typeof c.motionDetection === 'boolean' &&
      typeof c.privacyMode === 'boolean'
    );
  }

  return false;
}

export function isValidRule(val: unknown): val is Rule {
  if (!isRecord(val)) return false;
  if (
    typeof val['id'] !== 'string' ||
    typeof val['name'] !== 'string' ||
    typeof val['enabled'] !== 'boolean' ||
    !isRecord(val['conditionGroup']) ||
    !Array.isArray(val['actions']) ||
    typeof val['cooldownMinutes'] !== 'number' ||
    typeof val['createdAt'] !== 'number' ||
    typeof val['modifiedAt'] !== 'number'
  ) {
    return false;
  }

  const cg = val['conditionGroup'] as Record<string, unknown>;
  if (
    (cg['logic'] !== 'AND' && cg['logic'] !== 'OR') ||
    !Array.isArray(cg['conditions'])
  ) {
    return false;
  }

  return true;
}

export function isValidSchedule(val: unknown): val is Schedule {
  if (!isRecord(val)) return false;
  return (
    typeof val['id'] === 'string' &&
    typeof val['name'] === 'string' &&
    typeof val['enabled'] === 'boolean' &&
    typeof val['deviceId'] === 'string' &&
    isRecord(val['action']) &&
    typeof val['time'] === 'string' &&
    Array.isArray(val['weekdays']) &&
    typeof val['nextRunTime'] === 'number' &&
    typeof val['createdAt'] === 'number' &&
    typeof val['modifiedAt'] === 'number'
  );
}

export function isValidNotification(val: unknown): val is Notification {
  if (!isRecord(val)) return false;
  return (
    typeof val['id'] === 'string' &&
    typeof val['timestamp'] === 'number' &&
    typeof val['title'] === 'string' &&
    typeof val['message'] === 'string' &&
    typeof val['read'] === 'boolean' &&
    (val['severity'] === 'info' ||
      val['severity'] === 'success' ||
      val['severity'] === 'warning' ||
      val['severity'] === 'danger')
  );
}

export function isValidSimulationSpeed(val: unknown): val is SimulationSpeed {
  return val === 1 || val === 2 || val === 5 || val === 10;
}

export function sanitizeSimulationConfig(
  val: unknown
): PersistedSimulationConfig {
  if (!isRecord(val)) {
    return {
      speed: 1,
      seed: 4242,
      failNextCommand: false,
      failureProbability: 0.05,
    };
  }

  return {
    speed: isValidSimulationSpeed(val['speed']) ? val['speed'] : 1,
    seed: typeof val['seed'] === 'number' ? val['seed'] : 4242,
    failNextCommand:
      typeof val['failNextCommand'] === 'boolean'
        ? val['failNextCommand']
        : false,
    failureProbability:
      typeof val['failureProbability'] === 'number' &&
      val['failureProbability'] >= 0 &&
      val['failureProbability'] <= 1
        ? val['failureProbability']
        : 0.05,
  };
}

/**
 * Validates arbitrary parsed JSON data into a clean Partial<PersistedStateV1>.
 * Returns valid subsets if partial arrays or fields are corrupted, never throws.
 */
export function validateAndSanitizeState(
  raw: unknown
): Partial<PersistedStateV1> | null {
  if (!isRecord(raw)) {
    return null;
  }

  const result: Partial<PersistedStateV1> = {};

  if (Array.isArray(raw['devices'])) {
    result.devices = raw['devices'].filter(isValidDevice);
  }

  if (Array.isArray(raw['rules'])) {
    result.rules = raw['rules'].filter(isValidRule);
  }

  if (Array.isArray(raw['schedules'])) {
    result.schedules = raw['schedules'].filter(isValidSchedule);
  }

  if (Array.isArray(raw['notifications'])) {
    result.notifications = raw['notifications'].filter(isValidNotification);
  }

  if (raw['simulation'] !== undefined) {
    result.simulation = sanitizeSimulationConfig(raw['simulation']);
  }

  if (raw['theme'] === 'light' || raw['theme'] === 'dark') {
    result.theme = raw['theme'];
  }

  return result;
}

