import React from 'react';
import { dispatchDeviceCommand } from '@/services/commandDispatcher';
import { Card } from '@/components/common/Card';
import { Switch } from '@/components/common/Switch';
import { Slider } from '@/components/common/Slider';
import { Tabs } from '@/components/common/Tabs';
import { useChartTheme } from '@/hooks/useChartTheme';
import type {
  Room,
  Device,
  LightDevice,
  ThermostatDevice,
  CameraDevice,
} from '@/types';
import { Zap, Gauge, Thermometer, Droplets, Camera, WifiOff } from 'lucide-react';

export interface ControlArcPanelProps {
  selectedRoom: Room | null;
  devices: Device[];
  activeTab: 'thermostat' | 'light' | 'cameras';
  onTabChange: (tab: 'thermostat' | 'light' | 'cameras') => void;
  currentPowerWatts: number;
  todayEnergyKWh: number;
  indoorTemp: number;
  indoorHumidity: number;
}

export const ControlArcPanel: React.FC<ControlArcPanelProps> = ({
  selectedRoom,
  devices,
  activeTab,
  onTabChange,
  currentPowerWatts,
  todayEnergyKWh,
  indoorTemp,
  indoorHumidity,
}) => {
  const colors = useChartTheme();

  const roomDevices = React.useMemo(() => {
    if (!selectedRoom) return devices;
    return devices.filter((d) => d.roomId === selectedRoom.id);
  }, [devices, selectedRoom]);

  const activeLight = (roomDevices.find((d) => d.type === 'light') ||
    devices.find((d) => d.type === 'light')) as LightDevice | undefined;

  const activeThermo = (roomDevices.find((d) => d.type === 'thermostat') ||
    devices.find((d) => d.type === 'thermostat')) as ThermostatDevice | undefined;

  const cameraList = React.useMemo(() => {
    const inRoom = roomDevices.filter((d) => d.type === 'camera') as CameraDevice[];
    if (inRoom.length > 0) return inRoom;
    return devices.filter((d) => d.type === 'camera') as CameraDevice[];
  }, [roomDevices, devices]);

  // Semi-circular arc math (radius = 84, circumference of semicircle = PI * 84 ≈ 263.89)
  const radius = 84;
  const semiCircumference = Math.PI * radius;

  let arcFraction = 0;
  let arcReadout = '—';
  let arcCaption = 'Status';
  let activeDeviceName = 'No device';

  if (activeTab === 'light' && activeLight) {
    arcFraction = activeLight.on ? Math.min(1, Math.max(0, activeLight.brightness / 100)) : 0;
    arcReadout = activeLight.on ? `${activeLight.brightness}%` : 'Off';
    arcCaption = 'Intensity';
    activeDeviceName = activeLight.name;
  } else if (activeTab === 'thermostat' && activeThermo) {
    const span = Math.max(1, activeThermo.max - activeThermo.min);
    arcFraction = Math.min(1, Math.max(0, (activeThermo.target - activeThermo.min) / span));
    arcReadout = `${activeThermo.target.toFixed(1)}°${activeThermo.unit}`;
    arcCaption = `Current ${activeThermo.current.toFixed(1)}°${activeThermo.unit}`;
    activeDeviceName = activeThermo.name;
  } else if (activeTab === 'cameras') {
    const total = cameraList.length;
    const armed = cameraList.filter((c) => c.online && c.active).length;
    arcFraction = total > 0 ? armed / total : 0;
    arcReadout = `${armed}/${total}`;
    arcCaption = 'Cameras Armed';
    activeDeviceName = 'Perimeter Security';
  }

  const dashOffset = semiCircumference * (1 - arcFraction);

  return (
    <Card className="p-5 sm:p-6 bg-surface-elevated border border-border-subtle rounded-xl flex flex-col justify-between gap-5 h-full">
      {/* Header + Minimalist Pendant Lamp SVG matching Dribbble right panel */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Zone Control
            </span>
            <h2 className="text-xl font-bold text-text tracking-tight truncate mt-0.5">
              {selectedRoom ? selectedRoom.name : 'Living Room'}
            </h2>
            <p className="text-xs text-text-muted truncate mt-0.5">{activeDeviceName}</p>
          </div>

          {/* Minimalist Hanging Pendant Illustration (offline vector) */}
          <div className="shrink-0 -mt-5 sm:-mt-6 pr-1" aria-hidden="true">
            <svg viewBox="0 0 88 96" className="w-20 h-22" fill="none">
              <line
                x1="44"
                y1="0"
                x2="44"
                y2="24"
                stroke={colors.textMuted}
                strokeWidth="2.5"
              />
              <rect x="38" y="22" width="12" height="10" rx="3" fill={colors.textMuted} />
              <path
                d="M22 60 C22 38 32 30 44 30 C56 30 66 38 66 60 Z"
                fill={colors.isDark ? '#324247' : '#3C4649'}
              />
              <ellipse
                cx="44"
                cy="60"
                rx="22"
                ry="4.5"
                fill={colors.isDark ? '#1D2528' : '#252D30'}
              />
              <circle
                cx="44"
                cy="61"
                r="6"
                fill={
                  activeTab === 'light' && activeLight?.on
                    ? '#FDE68A'
                    : colors.isDark
                    ? '#4B5E63'
                    : '#CBD5E1'
                }
              />
            </svg>
          </div>
        </div>

        {/* Underline Sub-Tabs matching reference */}
        <Tabs
          items={[
            { id: 'thermostat', label: 'Thermostat' },
            { id: 'light', label: 'Smart Light' },
            { id: 'cameras', label: 'Cameras' },
          ]}
          value={activeTab}
          onChange={onTabChange}
          variant="underline"
          ariaLabel="Zone device categories"
          className="mt-1"
        />

        {/* Semi-Circular Arc Gauge */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative w-52 h-28 flex items-end justify-center">
            <svg viewBox="0 0 200 112" className="w-full h-full overflow-visible" aria-hidden="true">
              {/* Unfilled Track */}
              <path
                d="M 16 100 A 84 84 0 0 1 184 100"
                fill="none"
                stroke={colors.arcTrack}
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Active Value Arc */}
              <path
                d="M 16 100 A 84 84 0 0 1 184 100"
                fill="none"
                stroke={colors.arcFill}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={semiCircumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-x-0 bottom-1 flex flex-col items-center text-center">
              <span className="text-3xl font-bold text-text tabular-nums tracking-tight">
                {arcReadout}
              </span>
              <span className="text-xs font-medium text-text-muted mt-0.5">{arcCaption}</span>
            </div>
          </div>

          {/* Interactive Command Controls directly bound to active tab device */}
          <div className="w-full mt-4 p-3.5 rounded-lg bg-surface border border-border-subtle">
            {activeTab === 'light' && activeLight && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text truncate">
                    {activeLight.on ? 'Light Active' : 'Light Off'}
                  </span>
                  <Switch
                    checked={activeLight.on}
                    disabled={!activeLight.online}
                    onChange={(on) => dispatchDeviceCommand(activeLight.id, { on })}
                    aria-label={`Control panel power switch for ${activeLight.name}`}
                  />
                </div>
                <Slider
                  id="overview-arc-brightness"
                  label="Brightness"
                  unit="%"
                  min={0}
                  max={100}
                  value={activeLight.brightness}
                  disabled={!activeLight.online}
                  onChange={(brightness) =>
                    dispatchDeviceCommand(activeLight.id, {
                      brightness,
                      on: brightness > 0 ? true : activeLight.on,
                    })
                  }
                />
              </div>
            )}

            {activeTab === 'thermostat' && activeThermo && (
              <div className="space-y-2">
                <Slider
                  id="overview-arc-thermostat"
                  label="Setpoint"
                  unit={`°${activeThermo.unit}`}
                  min={activeThermo.min}
                  max={activeThermo.max}
                  step={0.5}
                  value={activeThermo.target}
                  disabled={!activeThermo.online}
                  onChange={(target) => dispatchDeviceCommand(activeThermo.id, { target })}
                />
              </div>
            )}

            {activeTab === 'cameras' && (
              <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                {cameraList.slice(0, 3).map((cam) => (
                  <div
                    key={cam.id}
                    className="flex items-center justify-between gap-2 text-xs py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {cam.online ? (
                        <Camera className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-danger shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-medium text-text truncate">{cam.name}</span>
                    </div>
                    <Switch
                      checked={cam.active}
                      disabled={!cam.online}
                      onChange={(active) => dispatchDeviceCommand(cam.id, { active })}
                      aria-label={`Arm camera ${cam.name}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom 2x2 Calm Functional Metric Tiles */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tile 1: Current Power */}
        <div className="rounded-lg bg-surface border border-border-subtle p-3.5 flex flex-col justify-between gap-2">
          <div className="h-7 w-7 rounded-md bg-surface-elevated text-accent border border-border-subtle flex items-center justify-center">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-muted">Current Power</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {currentPowerWatts} <span className="text-xs font-semibold text-text-muted">W</span>
            </p>
          </div>
        </div>

        {/* Tile 2: Today's Energy */}
        <div className="rounded-lg bg-surface border border-border-subtle p-3.5 flex flex-col justify-between gap-2">
          <div className="h-7 w-7 rounded-md bg-surface-elevated text-accent border border-border-subtle flex items-center justify-center">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-muted">Today&apos;s Energy</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {todayEnergyKWh.toFixed(2)} <span className="text-xs font-semibold text-text-muted">kWh</span>
            </p>
          </div>
        </div>

        {/* Tile 3: Indoor Temp */}
        <div className="rounded-lg bg-surface border border-border-subtle p-3.5 flex flex-col justify-between gap-2">
          <div className="h-7 w-7 rounded-md bg-surface-elevated text-accent border border-border-subtle flex items-center justify-center">
            <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-muted">Indoor Temp</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {indoorTemp.toFixed(1)} <span className="text-xs font-semibold text-text-muted">°C</span>
            </p>
          </div>
        </div>

        {/* Tile 4: Humidity */}
        <div className="rounded-lg bg-surface border border-border-subtle p-3.5 flex flex-col justify-between gap-2">
          <div className="h-7 w-7 rounded-md bg-surface-elevated text-accent border border-border-subtle flex items-center justify-center">
            <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-muted">Humidity</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">
              {indoorHumidity.toFixed(0)} <span className="text-xs font-semibold text-text-muted">%</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
