/**
 * Device domain models & discriminated union types.
 * Pure TypeScript, strict types, no `any`.
 */

export type DeviceType = 'light' | 'thermostat' | 'lock' | 'camera';

export interface BaseDevice {
  id: string;
  name: string;
  roomId: string;
  online: boolean;
  offlineReason?: string;
  updatedAt: number;
  powerWatts: number;
}

export interface LightDevice extends BaseDevice {
  type: 'light';
  on: boolean;
  brightness: number; // 0 - 100
  color: string; // Hex color code e.g. '#ffffff'
}

export interface ThermostatDevice extends BaseDevice {
  type: 'thermostat';
  current: number;
  target: number;
  min: number;
  max: number;
  unit: 'F' | 'C';
}

export interface LockDevice extends BaseDevice {
  type: 'lock';
  locked: boolean;
}

export interface CameraDevice extends BaseDevice {
  type: 'camera';
  active: boolean;
  motionDetection: boolean;
  privacyMode: boolean;
}

export type Device = LightDevice | ThermostatDevice | LockDevice | CameraDevice;

export interface Room {
  id: string;
  name: string;
  description?: string;
  floor?: number;
  targetTemp?: number;
  ambientTemp?: number;
  ambientHumidity?: number;
}

/**
 * Per-field rollback version map:
 * { [deviceId]: { [field]: sequenceNumber } }
 */
export type FieldSequenceMap = Record<string, Record<string, number>>;

