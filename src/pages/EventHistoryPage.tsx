import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useStore } from '@/store';
import {
  indexEventsForSearch,
  filterEvents,
  sortEvents,
} from '@/engine/eventFilters';
import { formatTimestamp, formatRelativeTime } from '@/utils/formatters';
import type { LogEvent, EventType, EventSeverity } from '@/types';
import {
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';

export const EventHistoryPage: React.FC = () => {
  const events = useStore((s) => s.events);
  const devices = useStore((s) => s.devices);
  const rooms = useStore((s) => s.rooms);

  // Local filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [inspectEvent, setInspectEvent] = useState<LogEvent | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Scroll container ref for TanStack Virtual
  const parentRef = useRef<HTMLDivElement>(null);

  // Device & Room Lookup Maps
  const deviceNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of devices) {
      map[d.id] = d.name;
    }
    return map;
  }, [devices]);

  const roomNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rooms) {
      map[r.id] = r.name;
    }
    return map;
  }, [rooms]);

  // Precompute lowercase compound index on events
  const indexedEvents = useMemo(() => {
    return indexEventsForSearch(events, deviceNameMap);
  }, [events, deviceNameMap]);

  // Multi-criteria filter & sort with performance measurement
  const { filteredEvents, queryDurationMs } = useMemo(() => {
    const t0 = performance.now();

    const activeFilter = {
      searchQuery: searchQuery.trim() || undefined,
      types: selectedType !== 'all' ? [selectedType as EventType] : undefined,
      severities:
        selectedSeverity !== 'all'
          ? [selectedSeverity as EventSeverity]
          : undefined,
      roomId: selectedRoomId !== 'all' ? selectedRoomId : undefined,
      deviceId: selectedDeviceId !== 'all' ? selectedDeviceId : undefined,
    };

    const filtered = filterEvents(indexedEvents, activeFilter, deviceNameMap);
    const sorted = sortEvents(filtered, sortOrder);

    const t1 = performance.now();
    return {
      filteredEvents: sorted,
      queryDurationMs: Math.round((t1 - t0) * 100) / 100,
    };
  }, [
    indexedEvents,
    searchQuery,
    selectedType,
    selectedSeverity,
    selectedRoomId,
    selectedDeviceId,
    sortOrder,
    deviceNameMap,
  ]);

  // TanStack Virtualizer for 60 FPS scrolling - virtualization config kept unchanged
  const rowVirtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const isAnyFilterActive =
    searchQuery.trim().length > 0 ||
    selectedType !== 'all' ||
    selectedSeverity !== 'all' ||
    selectedRoomId !== 'all' ||
    selectedDeviceId !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedSeverity('all');
    setSelectedRoomId('all');
    setSelectedDeviceId('all');
  };

  const handleExportFiltered = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nestora-events-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPayload = (details: Record<string, unknown>) => {
    navigator.clipboard?.writeText(JSON.stringify(details, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const renderSeverityChip = (severity: EventSeverity) => {
    const configs: Record<
      EventSeverity,
      { icon: React.ReactNode; text: string; classes: string }
    > = {
      alert: {
        icon: <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0" aria-hidden="true" />,
        text: 'Alert',
        classes: 'bg-danger/10 text-danger border-danger/25 font-semibold',
      },
      warning: {
        icon: (
          <AlertTriangle
            className="h-3.5 w-3.5 text-warning-strong dark:text-warning shrink-0"
            aria-hidden="true"
          />
        ),
        text: 'Warning',
        classes: 'bg-warning/15 text-warning-strong dark:text-warning border-warning/30 font-semibold',
      },
      success: {
        icon: <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />,
        text: 'Success',
        classes: 'bg-success/15 text-success border-success/30 font-semibold',
      },
      info: {
        icon: <Info className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />,
        text: 'Info',
        classes: 'bg-accent/15 text-accent border-accent/30 font-semibold',
      },
    };

    const cfg = configs[severity] || configs.info;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border shadow-2xs select-none ${cfg.classes}`}
      >
        {cfg.icon}
        <span>{cfg.text}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">Event History</h1>
            <Badge variant="accent" size="sm">
              TanStack Virtual 60 FPS
            </Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Search, filter, and inspect over {events.length.toLocaleString()} simulated audit logs and telemetry events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportFiltered}
            aria-label="Export filtered events as JSON"
          >
            <Download className="h-4 w-4 text-accent" />
            <span className="tabular-nums">Export ({filteredEvents.length.toLocaleString()})</span>
          </Button>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-[68px] z-20 backdrop-blur-md bg-surface/95 dark:bg-surface/90 border border-border-subtle rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search descriptions, devices..."
              aria-label="Search events"
              className="w-full pl-10 pr-3 py-2 min-h-[44px] lg:min-h-[36px] text-base sm:text-xs bg-surface border border-border-subtle rounded-xl text-text placeholder:text-text-muted focus-ring"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by event type"
              className="w-full px-3 py-2 min-h-[44px] lg:min-h-[36px] text-base sm:text-xs bg-surface border border-border-subtle rounded-xl text-text focus-ring"
            >
              <option value="all">All Types</option>
              <option value="device_state">Device State</option>
              <option value="command">Command</option>
              <option value="automation">Automation</option>
              <option value="security">Security</option>
              <option value="energy">Energy</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              aria-label="Filter by severity"
              className="w-full px-3 py-2 min-h-[44px] lg:min-h-[36px] text-base sm:text-xs bg-surface border border-border-subtle rounded-xl text-text focus-ring"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="alert">Alert</option>
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              aria-label="Filter by room"
              className="w-full px-3 py-2 min-h-[44px] lg:min-h-[36px] text-base sm:text-xs bg-surface border border-border-subtle rounded-xl text-text focus-ring"
            >
              <option value="all">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order with Indicator */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs rounded-xl"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <span className="sr-only">
                Sort order: currently {sortOrder === 'desc' ? 'newest first' : 'oldest first'}
              </span>
              <span className="flex items-center gap-1.5">
                {sortOrder === 'desc' ? (
                  <ArrowDown className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                )}
                <span className="font-semibold">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
                {sortOrder.toUpperCase()}
              </span>
            </Button>
          </div>
        </div>

        {/* Results Counter & Clear Filter */}
        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border-subtle flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              Showing <strong className="text-text font-bold">{filteredEvents.length.toLocaleString()}</strong> of{' '}
              {events.length.toLocaleString()} events
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-accent-subtle text-[#145246] dark:text-accent font-semibold tabular-nums border border-accent/20">
              {queryDurationMs} ms
            </span>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-accent hover:underline flex items-center gap-1 font-semibold focus-ring rounded-lg px-2 py-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Virtualized Event Table */}
      <Card
        aria-label="Audit event history"
        className="bg-surface border border-border-subtle rounded-3xl shadow-soft overflow-hidden"
      >
        {/* Table Header (Desktop) */}
        <div
          className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-3 bg-surface-card border-b border-border-subtle text-xs font-semibold text-text-muted select-none uppercase tracking-wider"
        >
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Severity & Type</div>
          <div className="col-span-3">Entity / Room</div>
          <div className="col-span-5">Description</div>
        </div>

        {/* Table Header (Mobile) */}
        <div className="sm:hidden px-4 py-2.5 bg-surface-card border-b border-border-subtle text-xs font-semibold text-text-muted select-none uppercase tracking-wider flex items-center justify-between">
          <span>Audit Log Entries</span>
          <span className="text-[11px] text-text-muted font-normal lowercase">tap row for details</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Filter className="h-8 w-8 mx-auto text-text-muted" />
            <h2 className="text-sm font-semibold text-text">No matching events</h2>
            <p className="text-xs text-text-muted">
              Try adjusting your search criteria or clearing active filters.
            </p>
            {isAnyFilterActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={clearAllFilters}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div
            ref={parentRef}
            tabIndex={0}
            role="region"
            aria-label="Virtualized event list"
            className="h-[580px] overflow-y-auto scrollbar-thin focus-ring"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const event = filteredEvents[virtualRow.index];
                if (!event) return null;

                const deviceName = event.deviceId ? deviceNameMap[event.deviceId] : undefined;
                const roomName = event.roomId ? roomNameMap[event.roomId] : undefined;

                return (
                  <div
                    key={event.id}
                    tabIndex={0}
                    onClick={() => setInspectEvent(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectEvent(event);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="border-b border-border-subtle hover:bg-surface-elevated/70 cursor-pointer transition-colors text-xs text-text focus:outline-none focus:bg-surface-elevated focus:ring-1 focus:ring-accent"
                    aria-label={`Event: ${event.description}`}
                  >
                    {/* Desktop layout: Dense readable 12-col grid */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 items-center h-full">
                      {/* Timestamp */}
                      <div className="col-span-2 font-mono text-[11px] text-text-muted truncate tabular-nums">
                        {formatTimestamp(event.timestamp)}
                      </div>

                      {/* Severity Chip with Icon and Text */}
                      <div className="col-span-2 flex items-center gap-1.5 truncate">
                        {renderSeverityChip(event.severity)}
                      </div>

                      {/* Entity / Room */}
                      <div className="col-span-3 truncate text-text-muted">
                        {deviceName ? (
                          <span className="font-semibold text-text">{deviceName}</span>
                        ) : (
                          <span className="italic">System</span>
                        )}
                        {roomName && (
                          <span className="text-[11px] text-text-muted ml-1.5">
                            ({roomName})
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div className="col-span-5 font-normal text-text truncate">
                        {event.description}
                      </div>
                    </div>

                    {/* Mobile layout: Two-line row card */}
                    <div className="flex sm:hidden flex-col justify-center px-3.5 py-2 h-full gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-text-muted tabular-nums">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        {renderSeverityChip(event.severity)}
                      </div>
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-semibold text-text truncate">
                          {event.description}
                        </span>
                        {deviceName && (
                          <span className="text-[10px] text-text-muted shrink-0 truncate max-w-[120px]">
                            ({deviceName})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Event Details Inspector Panel / Modal */}
      <Modal
        isOpen={inspectEvent !== null}
        onClose={() => setInspectEvent(null)}
        title="Audit Event Details"
        description="Inspect raw telemetry record, device entity links, and diagnostic metadata."
      >
        {inspectEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface-subtle border border-border-subtle rounded-2xl text-xs">
              <div>
                <span className="text-text-muted block text-[11px] font-medium">Event ID</span>
                <span className="font-mono font-bold text-text break-all">{inspectEvent.id}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px] font-medium">Timestamp</span>
                <span className="font-mono font-medium text-text tabular-nums">
                  {formatTimestamp(inspectEvent.timestamp)} ({formatRelativeTime(inspectEvent.timestamp)})
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px] font-medium">Category / Type</span>
                <Badge variant="outline" size="sm" className="mt-0.5 capitalize">
                  {inspectEvent.type.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <span className="text-text-muted block text-[11px] font-medium">Severity Level</span>
                <div className="mt-0.5">{renderSeverityChip(inspectEvent.severity)}</div>
              </div>
              {inspectEvent.deviceId && (
                <div>
                  <span className="text-text-muted block text-[11px] font-medium">Target Device</span>
                  <span className="font-bold text-text">
                    {deviceNameMap[inspectEvent.deviceId] || inspectEvent.deviceId}
                  </span>
                </div>
              )}
              {inspectEvent.roomId && (
                <div>
                  <span className="text-text-muted block text-[11px] font-medium">Room Location</span>
                  <span className="font-bold text-text">
                    {roomNameMap[inspectEvent.roomId] || inspectEvent.roomId}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-text block mb-1">Description</span>
              <p className="p-3 bg-surface border border-border-subtle rounded-xl text-xs text-text leading-relaxed">
                {inspectEvent.description}
              </p>
            </div>

            {inspectEvent.details && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-text">Payload Details</span>
                  <button
                    type="button"
                    onClick={() => handleCopyPayload(inspectEvent.details!)}
                    className="text-[11px] text-accent hover:underline inline-flex items-center gap-1 focus-ring rounded px-1.5 py-0.5"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="h-3 w-3 text-success" />
                        <span className="text-success font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-surface-subtle border border-border-subtle rounded-xl text-[11px] font-mono text-text overflow-x-auto max-h-40">
                  {JSON.stringify(inspectEvent.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border-subtle">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectEvent(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default EventHistoryPage;