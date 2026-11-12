import React from 'react';
import type { Device, LightDevice, ThermostatDevice, LockDevice, CameraDevice } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Switch } from '@/components/common/Switch';
import { DimmerSlider } from '@/components/controls/DimmerSlider';
import { ColorPicker } from '@/components/controls/ColorPicker';
import { RadialDial } from '@/components/controls/RadialDial';
import { dispatchDeviceCommand } from '@/services/commandDispatcher';
import { formatRelativeTime, formatTimestamp } from '@/utils/formatters';
import {
  Lightbulb,
  Thermometer,
  Lock,
  Unlock,
  Camera,
  Wifi,
  WifiOff,
} from 'lucide-react';

export interface DeviceDetailModalProps {
  device: Device | null;
  roomName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  device,
  roomName,
  isOpen,
  onClose,
}) => {
  if (!device) return null;

  const handleCommand = async (patch: Record<string, unknown>) => {
    if (!device.online) return;
    await dispatchDeviceCommand(device.id, patch);
  };

  const getDeviceIcon = () => {
    switch (device.type) {
      case 'light':
        return <Lightbulb className="h-6 w-6 text-pastel-peach-text" />;
      case 'thermostat':
        return <Thermometer className="h-6 w-6 text-pastel-blue-text" />;
      case 'lock':
        return device.locked ? (
          <Lock className="h-6 w-6 text-pastel-green-text" />
        ) : (
          <Unlock className="h-6 w-6 text-pastel-peach-text" />
        );
      case 'camera':
        return <Camera className="h-6 w-6 text-pastel-lavender-text" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={device.name}
      size="lg"
      description={`${roomName} • ${device.type.toUpperCase()} Device Details & Live Controls`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <span className="font-mono text-[11px] text-text-muted tabular-nums">
            ID: {device.id} • {formatTimestamp(device.updatedAt)}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero Header & Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-3xl bg-surface-card border border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center shadow-xs">
              {getDeviceIcon()}
            </div>
            <div>
              <h3 className="font-bold text-base text-text">{device.name}</h3>
              <p className="text-xs text-text-muted">{roomName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={device.online ? 'success' : 'danger'} size="sm">
              {device.online ? (
                <>
                  <Wifi className="h-3 w-3" aria-hidden="true" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" aria-hidden="true" />
                  <span>Offline</span>
                </>
              )}
            </Badge>
            <Badge variant="outline" size="sm" className="font-mono tabular-nums">
              {device.powerWatts} W
            </Badge>
          </div>
        </div>

        {/* 2x2 Pastel Telemetry Tiles (Matching Reference Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-pastel-peach-bg border border-border-subtle">
            <span className="text-[11px] font-semibold text-pastel-peach-text block">Current Power</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-pastel-peach-text tabular-nums">
                {device.powerWatts}
              </span>
              <span className="text-[10px] text-pastel-peach-text">W</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-pastel-lavender-bg border border-border-subtle">
            <span className="text-[11px] font-semibold text-pastel-lavender-text block">Operating State</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-bold text-pastel-lavender-text truncate">
                {device.online ? 'Normal' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-pastel-blue-bg border border-border-subtle">
            <span className="text-[11px] font-semibold text-pastel-blue-text block">Location</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-bold text-pastel-blue-text truncate">{roomName}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-pastel-green-bg border border-border-subtle">
            <span className="text-[11px] font-semibold text-pastel-green-text block">Last Sync</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xs font-bold text-pastel-green-text truncate tabular-nums">
                {formatRelativeTime(device.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Device Interactive Controls */}
        <div className="p-5 rounded-3xl bg-surface border border-border-subtle space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Interactive Control Surface
          </h4>

          {/* Light Detail */}
          {device.type === 'light' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-card border border-border-subtle">
                <span className="text-xs font-semibold text-text">Power Toggle</span>
                <Switch
                  checked={(device as LightDevice).on}
                  disabled={!device.online}
                  onChange={(on) => handleCommand({ on })}
                  aria-label={`Toggle ${(device as LightDevice).name}`}
                />
              </div>

              <DimmerSlider
                value={(device as LightDevice).on ? (device as LightDevice).brightness : 0}
                disabled={!device.online}
                onCommit={(brightness) =>
                  handleCommand({ brightness, on: brightness > 0 })
                }
              />

              <ColorPicker
                value={(device as LightDevice).color}
                disabled={!device.online}
                onCommit={(color) => handleCommand({ color })}
              />
            </div>
          )}

          {/* Thermostat Detail */}
          {device.type === 'thermostat' && (
            <div className="flex flex-col items-center py-2">
              <RadialDial
                current={(device as ThermostatDevice).current}
                target={(device as ThermostatDevice).target}
                min={(device as ThermostatDevice).min}
                max={(device as ThermostatDevice).max}
                unit={(device as ThermostatDevice).unit}
                disabled={!device.online}
                onCommit={(target) => handleCommand({ target })}
              />
            </div>
          )}

          {/* Lock Detail */}
          {device.type === 'lock' && (
            <div className="flex flex-col items-center gap-3 py-3">
              <div
                className={`p-4 rounded-3xl border ${
                  (device as LockDevice).locked
                    ? 'bg-pastel-green-bg text-pastel-green-text border-success/30'
                    : 'bg-pastel-peach-bg text-pastel-peach-text border-warning/30'
                }`}
              >
                {(device as LockDevice).locked ? (
                  <Lock className="h-8 w-8" />
                ) : (
                  <Unlock className="h-8 w-8" />
                )}
              </div>
              <span className="font-bold text-sm text-text">
                {(device as LockDevice).locked ? 'Door Deadbolt Secured' : 'Door Deadbolt Disengaged'}
              </span>
              <Button
                variant={(device as LockDevice).locked ? 'secondary' : 'primary'}
                size="sm"
                disabled={!device.online}
                onClick={() => handleCommand({ locked: !(device as LockDevice).locked })}
              >
                {(device as LockDevice).locked ? 'Unlock Door Deadbolt' : 'Lock Door Deadbolt'}
              </Button>
            </div>
          )}

          {/* Camera Detail */}
          {device.type === 'camera' && (
            <div className="space-y-3">
              <div className="p-3 text-center rounded-2xl bg-surface-card border border-border-subtle text-xs text-text-muted">
                Simulated camera. No video.
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                  <span className="text-xs text-text font-medium">Power Feed</span>
                  <Switch
                    checked={(device as CameraDevice).active}
                    disabled={!device.online}
                    onChange={(active) => handleCommand({ active })}
                    aria-label="Toggle camera active power"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                  <span className="text-xs text-text font-medium">Motion Detection</span>
                  <Switch
                    checked={(device as CameraDevice).motionDetection}
                    disabled={!device.online || !(device as CameraDevice).active}
                    onChange={(motionDetection) => handleCommand({ motionDetection })}
                    aria-label="Toggle motion detection"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                  <span className="text-xs text-text font-medium">Privacy Shutter</span>
                  <Switch
                    checked={(device as CameraDevice).privacyMode}
                    disabled={!device.online}
                    onChange={(privacyMode) => handleCommand({ privacyMode })}
                    aria-label="Toggle privacy mode"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
