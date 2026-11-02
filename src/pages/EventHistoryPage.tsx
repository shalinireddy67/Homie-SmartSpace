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
  ArrowUpDown,
  Download,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
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

  // Precompute lowercase compound index on the 10,000+ events
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

  // TanStack Virtualizer for 60 FPS scrolling
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

  const severityIcons: Record<EventSeverity, React.ReactNode> = {
    info: <Info className="h-3.5 w-3.5 text-accent" />,
    success: <CheckCircle className="h-3.5 w-3.5 text-success" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
    alert: <AlertCircle className="h-3.5 w-3.5 text-danger" />,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text">Event History</h1>
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
            <span>Export ({filteredEvents.length.toLocaleString()})</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-surface border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search descriptions, devices..."
              aria-label="Search events"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text focus-ring"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by event type"
              className="w-full px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text focus-ring"
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
              className="w-full px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text focus-ring"
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
              className="w-full px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text focus-ring"
            >
              <option value="all">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              aria-label={`Sort order: currently ${sortOrder === 'desc' ? 'newest first' : 'oldest first'}`}
            >
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-accent" />
                <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Results Counter & Clear Filter */}
        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-text font-semibold">{filteredEvents.length.toLocaleString()}</strong> of{' '}
              {events.length.toLocaleString()} events
            </span>
            <span className="font-mono text-[11px] text-accent font-medium">
              ({queryDurationMs} ms)
            </span>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-accent hover:underline flex items-center gap-1 font-medium focus-ring rounded"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </Card>

      {/* Virtualized Event Table */}
      <Card className="bg-surface border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-surface-subtle border-b border-border text-xs font-semibold text-text select-none">
          <div className="col-span-3 sm:col-span-2">Timestamp</div>
          <div className="col-span-3 sm:col-span-2">Severity & Type</div>
          <div className="hidden sm:block sm:col-span-3">Entity / Room</div>
          <div className="col-span-6 sm:col-span-5">Description</div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Filter className="h-8 w-8 mx-auto text-text-muted" />
            <h3 className="text-sm font-semibold text-text">No matching events</h3>
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
                    role="row"
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
                    className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-b border-border/60 hover:bg-surface-subtle cursor-pointer transition-colors text-xs text-text focus:outline-none focus:bg-surface-subtle focus:ring-1 focus:ring-accent"
                    aria-label={`Event: ${event.description}, Severity: ${event.severity}`}
                  >
                    {/* Timestamp */}
                    <div className="col-span-3 sm:col-span-2 font-mono text-[11px] text-text-muted truncate">
                      {formatTimestamp(event.timestamp)}
                    </div>

                    {/* Severity & Type */}
                    <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 truncate">
                      <span className="shrink-0">{severityIcons[event.severity]}</span>
                      <Badge
                        variant={
                          event.severity === 'alert'
                            ? 'danger'
                            : event.severity === 'warning'
                            ? 'warning'
                            : event.severity === 'success'
                            ? 'success'
                            : 'default'
                        }
                        size="sm"
                        className="capitalize"
                      >
                        {event.severity}
                      </Badge>
                    </div>

                    {/* Entity / Room */}
                    <div className="hidden sm:block sm:col-span-3 truncate text-text-muted">
                      {deviceName ? (
                        <span className="font-medium text-text">{deviceName}</span>
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
                    <div className="col-span-6 sm:col-span-5 font-normal text-text truncate">
                      {event.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Event Details Inspector Modal */}
      <Modal
        isOpen={inspectEvent !== null}
        onClose={() => setInspectEvent(null)}
        title="Audit Event Details"
        description="Inspect raw telemetry record, device entity links, and diagnostic metadata."
      >
        {inspectEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-surface-subtle border border-border rounded-xl text-xs">
              <div>
                <span className="text-text-muted block text-[11px]">Event ID</span>
                <span className="font-mono font-medium text-text break-all">{inspectEvent.id}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Timestamp</span>
                <span className="font-mono font-medium text-text">
                  {formatTimestamp(inspectEvent.timestamp)} ({formatRelativeTime(inspectEvent.timestamp)})
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Category / Type</span>
                <Badge variant="outline" size="sm" className="mt-0.5 capitalize">
                  {inspectEvent.type.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Severity Level</span>
                <Badge
                  variant={
                    inspectEvent.severity === 'alert'
                      ? 'danger'
                      : inspectEvent.severity === 'warning'
                      ? 'warning'
                      : inspectEvent.severity === 'success'
                      ? 'success'
                      : 'default'
                  }
                  size="sm"
                  className="mt-0.5 capitalize"
                >
                  {inspectEvent.severity}
                </Badge>
              </div>
              {inspectEvent.deviceId && (
                <div>
                  <span className="text-text-muted block text-[11px]">Target Device</span>
                  <span className="font-semibold text-text">
                    {deviceNameMap[inspectEvent.deviceId] || inspectEvent.deviceId}
                  </span>
                </div>
              )}
              {inspectEvent.roomId && (
                <div>
                  <span className="text-text-muted block text-[11px]">Room Location</span>
                  <span className="font-semibold text-text">
                    {roomNameMap[inspectEvent.roomId] || inspectEvent.roomId}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-text block mb-1">Description</span>
              <p className="p-3 bg-surface border border-border rounded-xl text-xs text-text leading-relaxed">
                {inspectEvent.description}
              </p>
            </div>

            {inspectEvent.details && (
              <div>
                <span className="text-xs font-semibold text-text block mb-1">Payload Details</span>
                <pre className="p-3 bg-surface-subtle border border-border rounded-xl text-[11px] font-mono text-text overflow-x-auto max-h-40">
                  {JSON.stringify(inspectEvent.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
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
