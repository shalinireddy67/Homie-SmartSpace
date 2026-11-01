/**
 * Energy monitoring and analytics domain models.
 */

export interface LivePowerReading {
  timestamp: number;
  totalWatts: number;
  roomWatts: Record<string, number>;
  deviceWatts: Record<string, number>;
}

export interface HistoricalEnergyReading {
  timestamp: number;
  kWh: number;
  costEstimate: number;
  isAnomaly: boolean;
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EnergyAnomaly {
  id: string;
  timestamp: number;
  deviceId?: string;
  roomId?: string;
  actualWatts: number;
  baselineWatts: number;
  severity: AnomalySeverity;
  description: string;
}

export type EnergyTimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

