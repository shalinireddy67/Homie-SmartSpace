import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { DeviceDetailModal } from '@/components/devices/DeviceDetailModal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { DeviceType } from '@/types';
import {
  Search,
  SlidersHorizontal,
  SearchX,
  X,
  Lightbulb,
  Thermometer,
  Lock,
  Camera,
  Grid,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const RoomsDevicesPage: React.FC = () => {
  const devices = useStore((s) => s.devices);
  const rooms = useStore((s) => s.rooms);
  const resetToDefaults = useStore((s) => s.resetToDefaults);

  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedDeviceId, setInspectedDeviceId] = useState<string | null>(null);

  // Stable lookup map for room names
  const roomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rooms) {
      map.set(r.id, r.name);
    }
    return map;
  }, [rooms]);

  // Compute device counts per room
  const deviceCountsByRoom = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of devices) {
      counts.set(d.roomId, (counts.get(d.roomId) || 0) + 1);
    }
    return counts;
  }, [devices]);

  // Filter combining Room AND Type AND Search Query
  const filteredDevices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return devices.filter((device) => {
      // 1. Room filter
      if (selectedRoom !== 'all' && device.roomId !== selectedRoom) {
        return false;
      }
      // 2. Type filter
      if (selectedType !== 'all' && device.type !== selectedType) {
        return false;
      }
      // 3. Search query filter
      if (query !== '') {
        const dName = device.name.toLowerCase();
        const rName = (roomMap.get(device.roomId) || '').toLowerCase();
        if (!dName.includes(query) && !rName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [devices, selectedRoom, selectedType, searchQuery, roomMap]);

  const handleInspectDevice = useCallback((id: string) => {
    setInspectedDeviceId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setInspectedDeviceId(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedRoom('all');
    setSelectedType('all');
    setSearchQuery('');
  }, []);

  const filteredOnline = useMemo(
    () => filteredDevices.filter((d) => d.online).length,
    [filteredDevices]
  );
  const filteredOffline = filteredDevices.length - filteredOnline;

  const inspectedDevice = useMemo(
    () => devices.find((d) => d.id === inspectedDeviceId) ?? null,
    [devices, inspectedDeviceId]
  );

  const hasActiveFilters =
    selectedRoom !== 'all' || selectedType !== 'all' || searchQuery.trim() !== '';

  const typeOptions: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Types', icon: <Grid className="h-3.5 w-3.5" /> },
    { id: 'light', label: 'Lights', icon: <Lightbulb className="h-3.5 w-3.5" /> },
    { id: 'thermostat', label: 'Thermostats', icon: <Thermometer className="h-3.5 w-3.5" /> },
    { id: 'lock', label: 'Locks', icon: <Lock className="h-3.5 w-3.5" /> },
    { id: 'camera', label: 'Cameras', icon: <Camera className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">Rooms & Devices</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time status and interactive controls for {devices.length} simulated home devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent">{rooms.length} Rooms</Badge>
          <Badge variant="default">{devices.length} Devices</Badge>
        </div>
      </div>

      {/* Room Navigation Tabs */}
      <div className="overflow-x-auto sm:overflow-visible pb-1 max-w-full">
        <div
          role="tablist"
          aria-label="Filter devices by room"
          className="flex items-center sm:flex-wrap gap-2 border-b border-border-subtle min-w-max sm:min-w-0 pb-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedRoom === 'all'}
            aria-controls="devices-grid"
            onClick={() => setSelectedRoom('all')}
            className={`px-4 py-2 min-h-[44px] rounded-full text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 border focus-ring whitespace-nowrap ${
              selectedRoom === 'all'
                ? 'bg-accent-subtle text-text border-border shadow-xs font-semibold'
                : 'bg-surface text-text-muted border-border-subtle hover:text-text hover:bg-surface-card'
            }`}
          >
            <span>All Rooms</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                selectedRoom === 'all'
                  ? 'bg-surface text-text border border-border-subtle'
                  : 'bg-surface-elevated text-text-muted'
              }`}
            >
              {devices.length}
            </span>
          </button>

          {rooms.map((room) => {
            const count = deviceCountsByRoom.get(room.id) || 0;
            const isSelected = selectedRoom === room.id;
            return (
              <button
                key={room.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="devices-grid"
                onClick={() => setSelectedRoom(room.id)}
                className={`px-4 py-2 min-h-[44px] rounded-full text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 border focus-ring whitespace-nowrap ${
                  isSelected
                    ? 'bg-accent-subtle text-text border-border shadow-xs font-semibold'
                    : 'bg-surface text-text-muted border-border-subtle hover:text-text hover:bg-surface-card'
                }`}
              >
                <span>{room.name}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                    isSelected
                      ? 'bg-surface text-text border border-border-subtle'
                      : 'bg-surface-elevated text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-surface-card rounded-2xl border border-border-subtle shadow-xs">
        {/* Device Type Filter Pills */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by device type"
        >
          {typeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedType(opt.id as DeviceType | 'all')}
              aria-pressed={selectedType === opt.id}
              className={`px-3.5 py-2 min-h-[44px] text-xs rounded-full border transition-all duration-200 flex items-center gap-1.5 focus-ring ${
                selectedType === opt.id
                  ? 'bg-accent-subtle border-accent text-text font-semibold shadow-xs'
                  : 'bg-surface border-border text-text-muted hover:text-text hover:bg-surface-elevated'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Search Field & Clear */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or room..."
              aria-label="Search devices or rooms"
              className="w-full pl-10 pr-9 py-2 min-h-[44px] text-base sm:text-xs bg-surface border border-border rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search text"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl focus-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-text-muted hover:text-danger gap-1 px-3 shrink-0 rounded-xl"
              aria-label="Clear all active filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Count Summary Strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-1"
        aria-live="polite"
        data-testid="devices-count-summary"
      >
        <p className="text-xs text-text-muted">
          Showing <strong className="font-semibold text-text tabular-nums">{filteredDevices.length}</strong> of{' '}
          <strong className="font-semibold text-text tabular-nums">{devices.length}</strong> devices
          {selectedRoom !== 'all' && ` in ${roomMap.get(selectedRoom) || 'selected room'}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" size="sm">
            <Wifi className="h-3 w-3" aria-hidden="true" />
            <span className="tabular-nums">{filteredOnline} online</span>
          </Badge>
          <Badge variant={filteredOffline > 0 ? 'danger' : 'default'} size="sm">
            <WifiOff className="h-3 w-3" aria-hidden="true" />
            <span className="tabular-nums">{filteredOffline} offline</span>
          </Badge>
        </div>
      </div>

      {/* Grid of Device Cards or Empty State */}
      <section id="devices-grid" aria-label="Device list" className="w-full">
        {devices.length === 0 ? (
          <div
            data-testid="empty-all-devices-state"
            className="flex flex-col items-center justify-center p-12 text-center bg-surface-card border border-dashed border-border rounded-3xl"
          >
            <div className="p-4 rounded-2xl bg-surface-elevated mb-3 text-text-muted">
              <Grid className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-base font-semibold text-text">No devices configured</h2>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              Your smart home has zero configured devices. Load the default simulated environment to begin monitoring.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => resetToDefaults()}
            >
              Load Demo Devices
            </Button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div
            data-testid="empty-devices-state"
            className="flex flex-col items-center justify-center p-12 text-center bg-surface-card border border-dashed border-border rounded-3xl"
          >
            <div className="p-4 rounded-2xl bg-surface-elevated mb-3 text-text-muted">
              <SearchX className="h-8 w-8" />
            </div>
            <h2 className="text-base font-semibold text-text">No devices found</h2>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              No devices match your current filters. Adjust your room tab, type selector, or search keyword.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                roomName={roomMap.get(device.roomId) || 'Unknown Room'}
                onInspect={handleInspectDevice}
              />
            ))}
          </div>
        )}
      </section>

      {inspectedDevice && (
        <DeviceDetailModal
          device={inspectedDevice}
          roomName={roomMap.get(inspectedDevice.roomId) || 'Unknown Room'}
          isOpen={Boolean(inspectedDevice)}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};
