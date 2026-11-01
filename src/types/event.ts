/**
 * Event log and audit trail domain models.
 */

export type EventSeverity = 'info' | 'success' | 'warning' | 'alert';

export type EventType =
  | 'device_state'
  | 'command'
  | 'automation'
  | 'security'
  | 'energy'
  | 'system';

export interface LogEvent {
  id: string;
  timestamp: number;
  type: EventType;
  severity: EventSeverity;
  deviceId?: string;
  automationId?: string;
  roomId?: string;
  description: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface EventFilter {
  searchQuery: string;
  types?: EventType[];
  severities?: EventSeverity[];
  roomId?: string;
  deviceId?: string;
  startDate?: number;
  endDate?: number;
  sortOrder?: 'asc' | 'desc';
}
