import React, { useState } from 'react';
import type { Device, LightDevice, ThermostatDevice, LockDevice, CameraDevice } from '@/types';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { Modal } from '@/components/common/Modal';
import { DimmerSlider } from '@/components/controls/DimmerSlider';
import { ColorPicker } from '@/components/controls/ColorPicker';
import { RadialDial } from '@/components/controls/RadialDial';
import { dispatchDeviceCommand } from '@/services/commandDispatcher';
import { useStore } from '@/store';
import { formatRelativeTime } from '@/utils/formatters';
import {
  Lightbulb,
  Thermometer,
  Lock,
  Unlock,
  Camera,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react';

export interface DeviceCardProps {
  device: Device;
  roomName: string;
  onCommand?: (deviceId: string, patch: Record<string, unknown>) => Promise<unknown>;
  renderSpy?: (deviceId: string) => void;
}


const DeviceCardComponent: React.FC<DeviceCardProps> = ({
  device,
  roomName,
  onCommand,
  renderSpy,
}) => {
  const [isPending, setIsPending] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const virtualTime = useStore((s) => s.virtualTime);

  if (!device) return null;

  // Call render spy for memo verification tests
  renderSpy?.(device.id);

  const handleCommand = async (patch: Record<string, unknown>) => {
    if (!device.online) return;
    setIsPending(true);
    try {
      if (onCommand) {
        await onCommand(device.id, patch);
      } else {
        await dispatchDeviceCommand(device.id, patch);
      }
    } finally {
      setIsPending(false);
    }
  };

  const getDeviceIcon = () => {
    switch (device.type) {
      case 'light':
        return <Lightbulb className={`h-5 w-5 ${device.on ? 'text-amber-500 fill-amber-500/20' : 'text-text-muted'}`} />;
      case 'thermostat':
        return <Thermometer className="h-5 w-5 text-accent" />;
      case 'lock':
        return device.locked ? (
          <Lock className="h-5 w-5 text-success" />
        ) : (
          <Unlock className="h-5 w-5 text-warning" />
        );
      case 'camera':
        return <Camera className="h-5 w-5 text-accent" />;
    }
  };

  const getCurrentReading = () => {
    switch (device.type) {
      case 'light':
        return device.on ? `${device.brightness}% brightness` : 'Off';
      case 'thermostat':
        return `${device.current.toFixed(1)}°${device.unit}`;
      case 'lock':
        return device.locked ? 'Locked' : 'Unlocked';
      case 'camera':
        return device.privacyMode
          ? 'Privacy Mode'
          : device.active
          ? 'Streaming'
          : 'Idle';
    }
  };

  const getCurrentState = () => {
    switch (device.type) {
      case 'light':
        return device.on ? 'Active' : 'Standby';
      case 'thermostat': {
        const diff = device.target - device.current;
        if (diff > 0.2) return 'Heating';
        if (diff < -0.2) return 'Cooling';
        return 'Idle';
      }
      case 'lock':
        return device.locked ? 'Secured' : 'Unsecured';
      case 'camera':
        return device.active ? 'Armed' : 'Disarmed';
    }
  };

  const lastUpdatedText = formatRelativeTime(device.updatedAt, virtualTime);

  return (
    <Card
      data-testid={`device-card-${device.id}`}
      className={`relative flex flex-col justify-between transition-all duration-200 border ${
        !device.online
          ? 'opacity-70 bg-surface-subtle/50 border-border/60'
          : 'bg-surface hover:border-border/80 shadow-xs'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-subtle border border-border/50">
              {getDeviceIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-text text-sm sm:text-base leading-tight">
                {device.name}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {roomName} • <span className="capitalize">{device.type}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Online / Offline status */}
            <Badge
              variant={device.online ? 'success' : 'danger'}
              size="sm"
              className="flex items-center gap-1 font-medium"
            >
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

            {/* Pending indicator */}
            {isPending && (
              <span
                className="flex items-center gap-1 text-[11px] font-medium text-accent animate-pulse"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Updating...</span>
              </span>
            )}
          </div>
        </div>

        {/* Readout Summary row */}
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Reading:</span>
            <span className="font-semibold text-text">{getCurrentReading()}</span>
            {device.type === 'light' && (
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-border shadow-xs ml-0.5"
                style={{ backgroundColor: (device as LightDevice).color }}
                title={`Current color: ${(device as LightDevice).color}`}
                aria-label={`Current color: ${(device as LightDevice).color}`}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-text-muted">
            <Zap className="h-3 w-3 text-warning" aria-hidden="true" />
            <span className="font-mono text-[11px]">{device.powerWatts}W</span>
            <span className="text-border">|</span>
            <span className="text-[11px] font-medium text-text">{getCurrentState()}</span>
          </div>
        </div>

        {/* Offline Reason Callout */}
        {!device.online && (
          <div
            className="mt-3 p-2 rounded-lg bg-danger/10 border border-danger/25 text-xs text-danger flex items-start gap-2"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold leading-tight">
                {device.offlineReason || 'Device offline'}
              </p>
              <p className="text-[11px] text-danger/80 mt-0.5">
                Controls are disabled because hardware is unreachable.
              </p>
            </div>
          </div>
        )}

        {/* Main Control Interface per Device Type */}
        <div className="mt-4 pt-3 border-t border-border/60">
          {/* Light Controls */}
          {device.type === 'light' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted">Power</span>
                <Switch
                  id={`switch-${device.id}`}
                  checked={(device as LightDevice).on}
                  disabled={!device.online}
                  aria-disabled={!device.online}
                  label={(device as LightDevice).on ? 'On' : 'Off'}
                  aria-label={`Toggle power for ${device.name}`}
                  onChange={(checked) => handleCommand({ on: checked })}
                />
              </div>

              <DimmerSlider
                value={(device as LightDevice).on ? (device as LightDevice).brightness : 0}
                disabled={!device.online}
                disabledReason={device.offlineReason}
                ariaLabel={`Brightness dimmer for ${device.name}`}
                onCommit={(brightness) =>
                  handleCommand({
                    brightness,
                    on: brightness > 0,
                  })
                }
              />

              <ColorPicker
                value={(device as LightDevice).color}
                disabled={!device.online}
                disabledReason={device.offlineReason}
                onCommit={(color) => handleCommand({ color })}
              />
            </div>
          )}

          {/* Thermostat Controls */}
          {device.type === 'thermostat' && (
            <div className="flex justify-center py-1">
              <RadialDial
                current={(device as ThermostatDevice).current}
                target={(device as ThermostatDevice).target}
                min={(device as ThermostatDevice).min}
                max={(device as ThermostatDevice).max}
                unit={(device as ThermostatDevice).unit}
                disabled={!device.online}
                disabledReason={device.offlineReason}
                onCommit={(target) => handleCommand({ target })}
              />
            </div>
          )}

          {/* Lock Controls */}
          {device.type === 'lock' && (
            <div className="flex flex-col items-center justify-center py-3 space-y-3">
              <div
                className={`p-4 rounded-full border ${
                  (device as LockDevice).locked
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-warning/10 border-warning/30 text-warning'
                }`}
              >
                {(device as LockDevice).locked ? (
                  <Lock className="h-8 w-8" />
                ) : (
                  <Unlock className="h-8 w-8" />
                )}
              </div>

              <div className="text-center">
                <span className="text-sm font-semibold text-text block">
                  {(device as LockDevice).locked ? 'Door Locked' : 'Door Unlocked'}
                </span>
                <span className="text-xs text-text-muted">
                  {(device as LockDevice).locked ? 'Deadbolt engaged' : 'Deadbolt disengaged'}
                </span>
              </div>

              <Button
                variant={(device as LockDevice).locked ? 'secondary' : 'primary'}
                size="sm"
                disabled={!device.online}
                aria-disabled={!device.online}
                onClick={() => setIsLockModalOpen(true)}
                className="w-full mt-2"
                aria-label={
                  (device as LockDevice).locked
                    ? `Unlock ${device.name}`
                    : `Lock ${device.name}`
                }
              >
                {(device as LockDevice).locked ? 'Unlock Door' : 'Lock Door'}
              </Button>

              {/* Confirm Modal */}
              <Modal
                isOpen={isLockModalOpen}
                onClose={() => setIsLockModalOpen(false)}
                title={(device as LockDevice).locked ? 'Confirm Door Unlock' : 'Confirm Door Lock'}
                description={`Are you sure you want to ${(device as LockDevice).locked ? 'unlock' : 'lock'} ${device.name}?`}
                footer={
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLockModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={(device as LockDevice).locked ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => {
                        setIsLockModalOpen(false);
                        handleCommand({ locked: !(device as LockDevice).locked });
                      }}
                    >
                      Confirm {(device as LockDevice).locked ? 'Unlock' : 'Lock'}
                    </Button>
                  </div>
                }
              >
                <div className="space-y-2 py-2">
                  <p className="text-sm text-text-muted">
                    {(device as LockDevice).locked
                      ? 'Unlocking this smart lock will disengage the physical deadbolt and grant access to the room.'
                      : 'Locking this smart lock will secure the physical deadbolt immediately.'}
                  </p>
                  <p className="text-xs text-text-muted italic">
                    Location: {roomName}
                  </p>
                </div>
              </Modal>
            </div>
          )}

          {/* Camera Controls */}
          {device.type === 'camera' && (
            <div className="space-y-3.5">
              <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 text-center">
                <span className="text-xs font-semibold text-text block">
                  Simulated camera. No video.
                </span>
                <span className="text-[11px] text-text-muted mt-0.5 block">
                  {(device as CameraDevice).privacyMode
                    ? 'Sensor privacy shutter closed'
                    : (device as CameraDevice).active
                    ? 'Telemetry feed simulated'
                    : 'Camera offline / standby'}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">Power</span>
                  <Switch
                    id={`camera-active-${device.id}`}
                    checked={(device as CameraDevice).active}
                    disabled={!device.online}
                    aria-disabled={!device.online}
                    label={(device as CameraDevice).active ? 'Active' : 'Standby'}
                    aria-label={`Toggle active power for ${device.name}`}
                    onChange={(active) => handleCommand({ active })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">Motion Detection</span>
                  <Switch
                    id={`camera-motion-${device.id}`}
                    checked={(device as CameraDevice).motionDetection}
                    disabled={!device.online || !(device as CameraDevice).active}
                    aria-disabled={!device.online || !(device as CameraDevice).active}
                    label={(device as CameraDevice).motionDetection ? 'Armed' : 'Off'}
                    aria-label={`Toggle motion detection for ${device.name}`}
                    onChange={(motionDetection) => handleCommand({ motionDetection })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">Privacy Mode</span>
                  <Switch
                    id={`camera-privacy-${device.id}`}
                    checked={(device as CameraDevice).privacyMode}
                    disabled={!device.online}
                    aria-disabled={!device.online}
                    label={(device as CameraDevice).privacyMode ? 'Shielded' : 'Open'}
                    aria-label={`Toggle privacy mode for ${device.name}`}
                    onChange={(privacyMode) => handleCommand({ privacyMode })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Relative Timestamp */}
      <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
        <span>Updated {lastUpdatedText}</span>
        <span className="font-mono text-[10px] text-text-muted/70">{device.id}</span>
      </div>
    </Card>
  );
};

export const DeviceCard = React.memo(DeviceCardComponent);
DeviceCard.displayName = 'DeviceCard';
