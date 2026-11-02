import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { DeviceCard } from '@/components/devices/DeviceCard';
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
} from 'lucide-react';

export const RoomsDevicesPage: React.FC = () => {
  const devices = useStore((s) => s.devices);
  const rooms = useStore((s) => s.rooms);

  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const handleClearFilters = useCallback(() => {
    setSelectedRoom('all');
    setSelectedType('all');
    setSearchQuery('');
  }, []);

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
          <h1 className="text-2xl font-bold tracking-tight text-text">Rooms & Devices</h1>
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
      <div className="overflow-x-auto pb-1 max-w-full">
        <div
          role="tablist"
          aria-label="Filter devices by room"
          className="flex items-center gap-2 border-b border-border/80 min-w-max pb-2.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedRoom === 'all'}
            aria-controls="devices-grid"
            onClick={() => setSelectedRoom('all')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-ring ${
              selectedRoom === 'all'
                ? 'bg-accent text-white shadow-xs font-semibold'
                : 'text-text-muted hover:text-text hover:bg-surface-elevated'
            }`}
          >
            <span>All Rooms</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                selectedRoom === 'all' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-text-muted'
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
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-ring ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text hover:bg-surface-elevated'
                }`}
              >
                <span>{room.name}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface-elevated text-text-muted'
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-surface rounded-2xl border border-border/80 shadow-xs">
        {/* Device Type Filter Pills */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by device type"
        >
          {typeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedType(opt.id as DeviceType | 'all')}
              aria-pressed={selectedType === opt.id}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-200 flex items-center gap-1.5 focus-ring ${
                selectedType === opt.id
                  ? 'bg-accent/15 border-accent text-accent font-semibold shadow-xs'
                  : 'bg-surface border-border/80 text-text-muted hover:text-text hover:border-border'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or room..."
              aria-label="Search devices or rooms"
              className="w-full pl-9 pr-8 py-2 text-xs bg-surface-elevated border border-border/80 rounded-xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search text"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
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
              className="text-xs text-text-muted hover:text-danger h-9 gap-1 px-2.5 shrink-0 rounded-xl"
              aria-label="Clear all active filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Device Cards or Empty State */}
      <section id="devices-grid" aria-label="Device list" className="w-full">
        {filteredDevices.length === 0 ? (
          <div
            data-testid="empty-devices-state"
            className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-dashed border-border/80 rounded-3xl"
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
