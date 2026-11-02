import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useStore } from '@/store';
import { dryRunRule, type DryRunReport } from '@/engine/dryRun';
import type { Rule } from '@/types';
import type { StateSnapshot } from '@/engine/automation';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Zap,
  Thermometer,
  Droplets,
  Calendar,
} from 'lucide-react';

export interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: Rule;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DryRunModal: React.FC<DryRunModalProps> = ({
  isOpen,
  onClose,
  rule,
}) => {
  const storeDevices = useStore((s) => s.devices);
  const storeRooms = useStore((s) => s.rooms);
  const storeVirtualTime = useStore((s) => s.virtualTime ?? Date.now());

  // Function to build initial snapshot from live store values
  const buildLiveSnapshot = (): StateSnapshot => {
    return {
      devices: JSON.parse(JSON.stringify(storeDevices)),
      rooms: JSON.parse(JSON.stringify(storeRooms)),
      currentTime: storeVirtualTime,
      totalWatts: storeDevices
        .filter((d) => d.online)
        .reduce((sum, d) => sum + d.powerWatts, 0),
    };
  };

  // Local snapshot state (NEVER mutates store)
  const [snapshot, setSnapshot] = useState<StateSnapshot>(buildLiveSnapshot);

  // Time format state in HH:mm
  const initialDate = new Date(snapshot.currentTime);
  const [timeStr, setTimeStr] = useState<string>(
    `${String(initialDate.getHours()).padStart(2, '0')}:${String(
      initialDate.getMinutes()
    ).padStart(2, '0')}`
  );
  const [selectedWeekday, setSelectedWeekday] = useState<number>(
    initialDate.getDay()
  );

  // Update snapshot when reset is clicked
  const handleResetToLive = () => {
    const live = buildLiveSnapshot();
    setSnapshot(live);
    const d = new Date(live.currentTime);
    setTimeStr(
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
        2,
        '0'
      )}`
    );
    setSelectedWeekday(d.getDay());
  };

  // Synchronize timeStr and selectedWeekday into snapshot.currentTime
  const handleTimeChange = (newTimeStr: string) => {
    setTimeStr(newTimeStr);
    const [h, m] = newTimeStr.split(':').map((v) => parseInt(v, 10));
    if (h !== undefined && m !== undefined && !isNaN(h) && !isNaN(m)) {
      const d = new Date(snapshot.currentTime);
      d.setHours(h, m, 0, 0);
      setSnapshot((prev) => ({ ...prev, currentTime: d.getTime() }));
    }
  };

  const handleWeekdayChange = (newDay: number) => {
    setSelectedWeekday(newDay);
    const d = new Date(snapshot.currentTime);
    const currentDay = d.getDay();
    const diff = newDay - currentDay;
    d.setDate(d.getDate() + diff);
    setSnapshot((prev) => ({ ...prev, currentTime: d.getTime() }));
  };

  // Environmental modifiers (ambientTemp, ambientHumidity, totalWatts)
  const handleAmbientTempChange = (temp: number) => {
    setSnapshot((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => ({ ...r, ambientTemp: temp })),
      devices: prev.devices.map((d) =>
        d.type === 'thermostat' ? { ...d, current: temp } : d
      ),
    }));
  };

  const handleAmbientHumidityChange = (hum: number) => {
    setSnapshot((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => ({ ...r, ambientHumidity: hum })),
    }));
  };

  const handleTotalWattsChange = (watts: number) => {
    setSnapshot((prev) => ({
      ...prev,
      totalWatts: watts,
    }));
  };

  // Device modifiers
  const handleDeviceOnlineToggle = (deviceId: string) => {
    setSnapshot((prev) => ({
      ...prev,
      devices: prev.devices.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              online: !d.online,
              offlineReason: d.online ? 'Simulated offline' : undefined,
            }
          : d
      ),
    }));
  };

  const handleDeviceStateToggle = (deviceId: string) => {
    setSnapshot((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => {
        if (d.id !== deviceId) return d;
        if (d.type === 'light') return { ...d, on: !d.on };
        if (d.type === 'lock') return { ...d, locked: !d.locked };
        return d;
      }),
    }));
  };

  // Run dry run evaluation (pure function, strictly isolated)
  const dryRunReport: DryRunReport = useMemo(() => {
    return dryRunRule(rule, snapshot);
  }, [rule, snapshot]);

  const primaryRoomTemp = snapshot.rooms[0]?.ambientTemp ?? 21;
  const primaryRoomHum = snapshot.rooms[0]?.ambientHumidity ?? 50;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dry Run: ${rule.name}`}
      size="xl"
      description="Test automation rule evaluation against a simulated snapshot without triggering live actions or store updates."
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToLive}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to live values</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Permanent Simulation Banner */}
        <div
          role="note"
          aria-label="Simulation notice"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-medium"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Simulation. Live devices are not changed.</span>
        </div>

        {/* Input Parameters Section */}
        <div className="space-y-4 bg-surface-subtle p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Simulated Snapshot Inputs
            </h3>
            <span className="text-[11px] text-text-muted">
              Live snapshot isolated in local state
            </span>
          </div>

          {/* Grid of Global Environment & Time Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Simulated Temp */}
            <div className="p-2.5 rounded-lg bg-surface border border-border">
              <label
                htmlFor="dryrun-temp"
                className="text-[11px] font-medium text-text-muted flex items-center gap-1 mb-1"
              >
                <Thermometer className="h-3.5 w-3.5 text-accent" />
                <span>Indoor Temp (°C)</span>
              </label>
              <input
                id="dryrun-temp"
                type="number"
                step="0.5"
                value={primaryRoomTemp}
                onChange={(e) => handleAmbientTempChange(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm bg-surface-elevated border border-border rounded font-mono text-text focus-ring"
              />
            </div>

            {/* Simulated Humidity */}
            <div className="p-2.5 rounded-lg bg-surface border border-border">
              <label
                htmlFor="dryrun-humidity"
                className="text-[11px] font-medium text-text-muted flex items-center gap-1 mb-1"
              >
                <Droplets className="h-3.5 w-3.5 text-accent" />
                <span>Humidity (%)</span>
              </label>
              <input
                id="dryrun-humidity"
                type="number"
                min="0"
                max="100"
                value={primaryRoomHum}
                onChange={(e) => handleAmbientHumidityChange(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm bg-surface-elevated border border-border rounded font-mono text-text focus-ring"
              />
            </div>

            {/* Simulated Power */}
            <div className="p-2.5 rounded-lg bg-surface border border-border">
              <label
                htmlFor="dryrun-watts"
                className="text-[11px] font-medium text-text-muted flex items-center gap-1 mb-1"
              >
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span>Total Power (W)</span>
              </label>
              <input
                id="dryrun-watts"
                type="number"
                min="0"
                value={snapshot.totalWatts ?? 0}
                onChange={(e) => handleTotalWattsChange(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm bg-surface-elevated border border-border rounded font-mono text-text focus-ring"
              />
            </div>

            {/* Simulated Time */}
            <div className="p-2.5 rounded-lg bg-surface border border-border">
              <label
                htmlFor="dryrun-time"
                className="text-[11px] font-medium text-text-muted flex items-center gap-1 mb-1"
              >
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span>Time of Day</span>
              </label>
              <input
                id="dryrun-time"
                type="time"
                value={timeStr}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-surface-elevated border border-border rounded font-mono text-text focus-ring"
              />
            </div>
          </div>

          {/* Weekday Selection Chips */}
          <div>
            <label className="text-[11px] font-medium text-text-muted flex items-center gap-1 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-accent" />
              <span>Simulated Weekday</span>
            </label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Simulated weekday">
              {WEEKDAYS.map((dayName, idx) => {
                const isSelected = selectedWeekday === idx;
                return (
                  <button
                    key={dayName}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleWeekdayChange(idx)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors focus-ring ${
                      isSelected
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-surface text-text-muted hover:text-text border border-border'
                    }`}
                  >
                    {dayName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Relevant Device States Toggles */}
          <div>
            <span className="text-[11px] font-medium text-text-muted block mb-1.5">
              Device State Overrides
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
              {snapshot.devices.map((dev) => (
                <div
                  key={dev.id}
                  className="pt-1.5 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-text truncate max-w-[200px]">
                    {dev.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Online Toggle */}
                    <button
                      type="button"
                      onClick={() => handleDeviceOnlineToggle(dev.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                        dev.online
                          ? 'bg-success/15 text-success border border-success/30'
                          : 'bg-danger/15 text-danger border border-danger/30'
                      }`}
                    >
                      {dev.online ? 'Online' : 'Offline'}
                    </button>

                    {/* State toggle for Light or Lock */}
                    {dev.type === 'light' && (
                      <button
                        type="button"
                        onClick={() => handleDeviceStateToggle(dev.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                          dev.on
                            ? 'bg-accent/15 text-accent border-accent/30'
                            : 'bg-surface border-border text-text-muted'
                        }`}
                      >
                        {dev.on ? 'Light ON' : 'Light OFF'}
                      </button>
                    )}
                    {dev.type === 'lock' && (
                      <button
                        type="button"
                        onClick={() => handleDeviceStateToggle(dev.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                          dev.locked
                            ? 'bg-accent/15 text-accent border-accent/30'
                            : 'bg-surface border-border text-text-muted'
                        }`}
                      >
                        {dev.locked ? 'Locked' : 'Unlocked'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evaluation Output Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Dry-Run Output & Audit
            </h3>
            <Badge
              variant={dryRunReport.overall ? 'success' : 'danger'}
              size="md"
              className="font-bold tracking-wide uppercase text-xs"
            >
              {dryRunReport.overall ? '✓ Eligible to Trigger' : '✕ Ineligible to Trigger'}
            </Badge>
          </div>

          {/* Logic & Time Window Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
              <span className="text-text-muted">Condition Logic ({rule.conditionGroup.logic}):</span>
              <span className={`font-semibold ${dryRunReport.groupResult ? 'text-success' : 'text-danger'}`}>
                {dryRunReport.groupResult ? 'Passed' : 'Failed'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
              <span className="text-text-muted">Time Window:</span>
              <span className={`font-semibold ${dryRunReport.windowResult ? 'text-success' : 'text-danger'}`}>
                {dryRunReport.windowResult ? 'Inside Window' : 'Outside Window'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
              <span className="text-text-muted">Weekday Check:</span>
              <span className={`font-semibold ${dryRunReport.weekdayResult ? 'text-success' : 'text-danger'}`}>
                {dryRunReport.weekdayResult ? 'Allowed Day' : 'Excluded Day'}
              </span>
            </div>
          </div>

          {/* Condition-by-Condition Audit */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-text">Condition Audit</span>
            <div className="space-y-1.5">
              {dryRunReport.conditionResults.map((cRes, idx) => (
                <div
                  key={cRes.id || idx}
                  className={`p-3 rounded-lg border flex items-start justify-between text-xs gap-3 ${
                    cRes.passed
                      ? 'bg-success/5 border-success/30'
                      : 'bg-danger/5 border-danger/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {cRes.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-medium text-text">
                        Condition #{idx + 1}: {cRes.reason}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Actual: <span className="font-mono">{String(cRes.actualValue)}</span> | Expected: <span className="font-mono">{String(cRes.expectedValue)}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant={cRes.passed ? 'success' : 'danger'} size="sm">
                    {cRes.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Proposed Actions Analysis */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-text">Proposed Actions Analysis</span>
            <div className="space-y-1.5">
              {dryRunReport.proposedActions.map((pa, idx) => (
                <div
                  key={pa.action.id || idx}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs gap-3 ${
                    pa.willRun
                      ? 'bg-surface border-border'
                      : 'bg-surface-subtle border-border/60 opacity-80'
                  }`}
                >
                  <div>
                    <span className="font-medium text-text">
                      {pa.targetDevice?.name || pa.action.deviceId}
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                      {pa.reason}
                    </p>
                  </div>
                  <Badge variant={pa.willRun ? 'success' : 'outline'} size="sm">
                    {pa.willRun ? 'Would Run' : 'Would Not Run'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

