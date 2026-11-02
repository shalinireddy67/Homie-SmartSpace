/**
 * High-Performance Event Filter & Sorting Engine.
 * Pure TypeScript. Zero React imports.
 *
 * Guarantees:
 * - Precomputed lowercase composite search index (_searchField) computed once for sub-millisecond querying over 10,000+ items.
 * - Multi-criteria filtering: text search, type, device, room, severity, and start/end timestamps.
 * - Strict AND combination across all active filter dimensions.
 * - Non-mutating ascending/descending sorting by timestamp.
 */

import type { LogEvent, EventFilter, EventType, EventSeverity } from '@/types';

export interface IndexedLogEvent extends LogEvent {
  /** Precomputed lowercase compound search text: `${description} ${deviceName} ${type}` */
  _searchField?: string;
}

/**
 * Precomputes a composite lowercase search field on each event once,
 * incorporating description, resolved device name, and event type.
 */
export function indexEventsForSearch(
  events: LogEvent[],
  deviceNames?: Record<string, string> | Map<string, string>
): IndexedLogEvent[] {
  const getDeviceName = (id?: string): string => {
    if (!id || !deviceNames) return '';
    return deviceNames instanceof Map ? deviceNames.get(id) ?? '' : deviceNames[id] ?? '';
  };

  return events.map((e) => ({
    ...e,
    _searchField: `${e.description} ${getDeviceName(e.deviceId)} ${e.type}`.toLowerCase(),
  }));
}

/**
 * Filters a collection of events according to the provided EventFilter.
 * All specified filter dimensions are combined using strict logical AND.
 */
export function filterEvents(
  events: readonly (LogEvent | IndexedLogEvent)[],
  filter: Partial<EventFilter>,
  deviceNames?: Record<string, string> | Map<string, string>
): IndexedLogEvent[] {
  const query = filter.searchQuery ? filter.searchQuery.trim().toLowerCase() : '';
  const typesSet = filter.types && filter.types.length > 0 ? new Set<EventType>(filter.types) : null;
  const severitiesSet =
    filter.severities && filter.severities.length > 0 ? new Set<EventSeverity>(filter.severities) : null;
  const targetRoom = filter.roomId && filter.roomId.trim().length > 0 ? filter.roomId : null;
  const targetDevice = filter.deviceId && filter.deviceId.trim().length > 0 ? filter.deviceId : null;
  const startDate = filter.startDate !== undefined ? filter.startDate : null;
  const endDate = filter.endDate !== undefined ? filter.endDate : null;

  const getDeviceName = (id?: string): string => {
    if (!id || !deviceNames) return '';
    return deviceNames instanceof Map ? deviceNames.get(id) ?? '' : deviceNames[id] ?? '';
  };

  const results: IndexedLogEvent[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;

    // 1. Text Search (case-insensitive over description, device name, and type)
    if (query.length > 0) {
      const searchField =
        (e as IndexedLogEvent)._searchField ??
        `${e.description} ${getDeviceName(e.deviceId)} ${e.type}`.toLowerCase();
      if (!searchField.includes(query)) {
        continue;
      }
    }

    // 2. Event Type
    if (typesSet && !typesSet.has(e.type)) {
      continue;
    }

    // 3. Severity
    if (severitiesSet && !severitiesSet.has(e.severity)) {
      continue;
    }

    // 4. Room ID
    if (targetRoom && e.roomId !== targetRoom) {
      continue;
    }

    // 5. Device ID
    if (targetDevice && e.deviceId !== targetDevice) {
      continue;
    }

    // 6. Date Range (startDate <= timestamp <= endDate)
    if (startDate !== null && e.timestamp < startDate) {
      continue;
    }
    if (endDate !== null && e.timestamp > endDate) {
      continue;
    }

    results.push(e as IndexedLogEvent);
  }

  return results;
}

/**
 * Pure non-mutating sort of events by timestamp in ascending or descending order.
 */
export function sortEvents(
  events: readonly (LogEvent | IndexedLogEvent)[],
  order: 'asc' | 'desc' = 'desc'
): IndexedLogEvent[] {
  const copy = [...(events as IndexedLogEvent[])];
  return copy.sort((a, b) => {
    if (a.timestamp === b.timestamp) {
      return a.id.localeCompare(b.id);
    }
    return order === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
  });
}

