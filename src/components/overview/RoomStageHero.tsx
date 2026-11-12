import React from 'react';
import { dispatchDeviceCommand } from '@/services/commandDispatcher';
import { Card } from '@/components/common/Card';
import { Switch } from '@/components/common/Switch';
import { Tabs } from '@/components/common/Tabs';
import { useChartTheme } from '@/hooks/useChartTheme';
import type {
  Room,
  Device,
  LightDevice,
  ThermostatDevice,
  LockDevice,
  CameraDevice,
  Schedule,
} from '@/types';
import {
  Home,
  Thermometer,
  Lightbulb,
  Lock,
  Unlock,
  CalendarClock,
  Zap,
  Cpu,
  Minus,
  Plus,
  ShieldCheck,
  Camera,
} from 'lucide-react';

export interface RoomStageHeroProps {
  rooms: Room[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  devices: Device[];
  schedules: Schedule[];
  onToggleSchedule: (scheduleId: string) => void;
  todayEnergyKWh: number;
  indoorTemp: number;
  indoorHumidity: number;
  onFocusControlTab: (tab: 'thermostat' | 'light' | 'cameras') => void;
}

export const RoomStageHero: React.FC<RoomStageHeroProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  devices,
  schedules,
  onToggleSchedule,
  todayEnergyKWh,
  indoorTemp,
  indoorHumidity,
  onFocusControlTab,
}) => {
  const colors = useChartTheme();

  const roomDevices = React.useMemo(() => {
    if (selectedRoomId === 'all') return devices;
    return devices.filter((d) => d.roomId === selectedRoomId);
  }, [devices, selectedRoomId]);

  const selectedRoom = React.useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const stageTemp = selectedRoom?.ambientTemp ?? indoorTemp;
  const stageHumidity = selectedRoom?.ambientHumidity ?? indoorHumidity;
  const onlineCount = roomDevices.filter((d) => d.online).length;
  const offlineCount = roomDevices.length - onlineCount;

  // Pick representative devices for the stage Lock card and Bottom 3 Quick-Widget Cards
  const stageLock = (roomDevices.find((d) => d.type === 'lock') ||
    devices.find((d) => d.type === 'lock')) as LockDevice | undefined;

  const quickThermo = (roomDevices.find((d) => d.type === 'thermostat') ||
    devices.find((d) => d.type === 'thermostat')) as ThermostatDevice | undefined;

  const quickLight = (roomDevices.find((d) => d.type === 'light') ||
    devices.find((d) => d.type === 'light')) as LightDevice | undefined;

  const quickSchedule = schedules[0];

  // Live hotspot counts for the stage
  const lightsCount = roomDevices.filter((d) => d.type === 'light').length;
  const thermosCount = roomDevices.filter((d) => d.type === 'thermostat').length;
  const camsCount = roomDevices.filter((d) => d.type === 'camera').length;

  const roomTabItems = React.useMemo(
    () => [
      { id: 'all', label: 'All Rooms', icon: <Home className="h-3.5 w-3.5" /> },
      ...rooms.map((room) => ({
        id: room.id,
        label: room.name,
        icon: <Home className="h-3.5 w-3.5" />,
      })),
    ],
    [rooms]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Room Selector Pill Chips */}
      <Tabs
        items={roomTabItems}
        value={selectedRoomId}
        onChange={onSelectRoom}
        variant="pill"
        ariaLabel="Filter overview stage by room"
      />

      {/* Hero Architectural Room Stage Card */}
      <div className="relative rounded-3xl overflow-hidden border border-border-subtle shadow-soft min-h-[260px] sm:min-h-[300px] bg-surface-elevated flex flex-col justify-between p-4 sm:p-5">
        {/* Offline Crisp Architectural Interior SVG Backdrop */}
        <svg
          viewBox="0 0 800 360"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="stageBgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.isDark ? '#1B2528' : '#E5EFEF'} />
              <stop offset="55%" stopColor={colors.isDark ? '#202D30' : '#DCE9EA'} />
              <stop offset="100%" stopColor={colors.isDark ? '#172022' : '#EDF4F4'} />
            </linearGradient>
            <linearGradient id="sunWash" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor={colors.isDark ? 'rgba(94,194,172,0.14)' : 'rgba(255,255,255,0.85)'} />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Back wall & floor */}
          <rect width="800" height="360" fill="url(#stageBgGrad)" />
          <path
            d="M0 245 L800 245 L800 360 L0 360 Z"
            fill={colors.isDark ? '#141B1D' : '#D5E4E5'}
          />
          <polygon points="180,0 520,0 440,245 120,245" fill="url(#sunWash)" />

          {/* Architectural window frame */}
          <rect
            x="220"
            y="28"
            width="230"
            height="160"
            rx="14"
            fill={colors.isDark ? '#151E20' : '#F4FAFA'}
            stroke={colors.isDark ? '#324246' : '#BFCFCE'}
            strokeWidth="3"
          />
          <line
            x1="335"
            y1="28"
            x2="335"
            y2="188"
            stroke={colors.isDark ? '#324246' : '#BFCFCE'}
            strokeWidth="3"
          />

          {/* Minimalist sofa silhouette */}
          <rect
            x="230"
            y="188"
            width="280"
            height="68"
            rx="18"
            fill={colors.isDark ? '#29373B' : '#F7FBFB'}
            stroke={colors.isDark ? '#3E5257' : '#C2D4D6'}
            strokeWidth="2"
          />
          <rect
            x="252"
            y="172"
            width="112"
            height="34"
            rx="10"
            fill={colors.isDark ? '#324449' : '#FFFFFF'}
          />
          <rect
            x="376"
            y="172"
            width="112"
            height="34"
            rx="10"
            fill={colors.isDark ? '#324449' : '#FFFFFF'}
          />

          {/* Accent armchair */}
          <rect
            x="555"
            y="196"
            width="120"
            height="68"
            rx="22"
            fill={colors.isDark ? '#3D4D4A' : '#E7D8C5'}
          />

          {/* Coffee table */}
          <ellipse
            cx="400"
            cy="296"
            rx="105"
            ry="20"
            fill={colors.isDark ? '#232F32' : '#FFFFFF'}
            stroke={colors.isDark ? '#38484D' : '#C8D8DA'}
            strokeWidth="2"
          />

          {/* Botanical plant silhouette left */}
          <rect
            x="76"
            y="206"
            width="44"
            height="54"
            rx="10"
            fill={colors.isDark ? '#283639' : '#E4ECEC'}
          />
          <path
            d="M98 206 C76 170 62 140 82 115 C94 140 96 175 98 206 Z"
            fill={colors.arcFill}
            opacity="0.7"
          />
          <path
            d="M98 206 C115 162 140 142 132 112 C110 132 104 170 98 206 Z"
            fill={colors.arcFill}
            opacity="0.9"
          />

          {/* Floor lamp right */}
          <line
            x1="696"
            y1="95"
            x2="696"
            y2="255"
            stroke={colors.isDark ? '#4B5E63' : '#9EB2B5'}
            strokeWidth="3"
          />
          <path
            d="M674 95 L718 95 L710 68 L682 68 Z"
            fill={colors.isDark ? '#36474B' : '#FFFFFF'}
            stroke={colors.isDark ? '#586B70' : '#9EB2B5'}
            strokeWidth="2"
          />
        </svg>

        {/* Top Bar Inside Stage: Active Zone Badge + Live Energy & Device Pills */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-border-subtle shadow-xs text-xs font-medium text-text">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            <span className="font-semibold">
              {selectedRoom ? selectedRoom.name : 'All Home Zones'}
            </span>
            <span className="text-text-muted tabular-nums">
              • {stageTemp.toFixed(1)}°C • {stageHumidity.toFixed(0)}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-border-subtle shadow-xs text-xs font-semibold text-text tabular-nums">
              <Zap className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>{todayEnergyKWh.toFixed(2)} kWh</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-border-subtle shadow-xs text-xs font-semibold text-text tabular-nums">
              <Cpu className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>
                {roomDevices.length} {roomDevices.length === 1 ? 'Device' : 'Devices'}
              </span>
              <span className="text-[11px] font-normal text-text-muted">
                ({onlineCount} on{offlineCount > 0 ? `, ${offlineCount} off` : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Middle Interactive Hotspot Device Group Chips */}
        <div className="relative z-10 my-5 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={() => onFocusControlTab('light')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111618]/80 text-white text-xs font-medium shadow-soft hover:bg-[#111618] transition-transform hover:-translate-y-0.5 focus-ring min-h-[36px]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white ring-4 ring-white/25" aria-hidden="true" />
            <span>
              {lightsCount} {lightsCount === 1 ? 'Light' : 'Lights'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFocusControlTab('thermostat')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111618]/80 text-white text-xs font-medium shadow-soft hover:bg-[#111618] transition-transform hover:-translate-y-0.5 focus-ring min-h-[36px]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white ring-4 ring-white/25" aria-hidden="true" />
            <span>
              {thermosCount} {thermosCount === 1 ? 'Thermostat' : 'Thermostats'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFocusControlTab('cameras')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111618]/80 text-white text-xs font-medium shadow-soft hover:bg-[#111618] transition-transform hover:-translate-y-0.5 focus-ring min-h-[36px]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white ring-4 ring-white/25" aria-hidden="true" />
            <span>
              {camsCount} {camsCount === 1 ? 'Camera' : 'Cameras'}
            </span>
          </button>
        </div>

        {/* Bottom-Left Floating Frosted Smart Door Lock Card */}
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          {stageLock && (
            <div className="bg-surface/95 backdrop-blur-md border border-border-subtle rounded-2xl p-3.5 shadow-soft flex items-center gap-3.5 min-w-[230px]">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  stageLock.locked
                    ? 'bg-pastel-green-bg text-pastel-green-text'
                    : 'bg-pastel-peach-bg text-pastel-peach-text'
                }`}
                aria-hidden="true"
              >
                {stageLock.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text truncate">{stageLock.name}</p>
                <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="h-3 w-3 text-accent" aria-hidden="true" />
                  <span>{stageLock.locked ? 'Locked' : 'Unlocked'}</span>
                </p>
              </div>
              <Switch
                checked={stageLock.locked}
                disabled={!stageLock.online}
                onChange={(locked) => dispatchDeviceCommand(stageLock.id, { locked })}
                aria-label={`Stage lock switch for ${stageLock.name}`}
              />
            </div>
          )}

          {/* Camera Active Pill if cameras exist in view */}
          {roomDevices.some((d) => d.type === 'camera') && (
            <button
              type="button"
              onClick={() => onFocusControlTab('cameras')}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface/90 backdrop-blur-md border border-border-subtle text-xs font-medium text-text hover:bg-surface transition-colors focus-ring"
            >
              <Camera className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>
                {
                  roomDevices.filter((d) => d.type === 'camera' && (d as CameraDevice).active)
                    .length
                }{' '}
                / {camsCount} Cameras Armed
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom 3 Quick-Widget Cards matching reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Quick Card 1: Thermostat */}
        <Card className="p-4 sm:p-5 bg-surface-card rounded-3xl flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="h-11 w-11 rounded-2xl bg-pastel-blue-bg text-pastel-blue-text flex items-center justify-center shrink-0">
              <Thermometer className="h-5 w-5" aria-hidden="true" />
            </div>
            {quickThermo && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!quickThermo.online || quickThermo.target <= quickThermo.min}
                  onClick={() =>
                    dispatchDeviceCommand(quickThermo.id, {
                      target: Math.max(quickThermo.min, quickThermo.target - 0.5),
                    })
                  }
                  aria-label={`Decrease target for ${quickThermo.name}`}
                  className="h-9 w-9 sm:h-7 sm:w-7 rounded-full bg-surface border border-border text-text hover:bg-surface-elevated flex items-center justify-center focus-ring disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={!quickThermo.online || quickThermo.target >= quickThermo.max}
                  onClick={() =>
                    dispatchDeviceCommand(quickThermo.id, {
                      target: Math.min(quickThermo.max, quickThermo.target + 0.5),
                    })
                  }
                  aria-label={`Increase target for ${quickThermo.name}`}
                  className="h-9 w-9 sm:h-7 sm:w-7 rounded-full bg-surface border border-border text-text hover:bg-surface-elevated flex items-center justify-center focus-ring disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {quickThermo ? (
            <div>
              <p className="text-xs font-medium text-text-muted truncate">{quickThermo.name}</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-text tabular-nums">
                  {quickThermo.target.toFixed(1)}°{quickThermo.unit}
                </span>
                <span className="text-[11px] text-text-muted tabular-nums">
                  Now {quickThermo.current.toFixed(1)}°
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">No thermostat configured</p>
          )}
        </Card>

        {/* Quick Card 2: Smart Light */}
        <Card className="p-4 sm:p-5 bg-surface-card rounded-3xl flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div
              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                quickLight?.on
                  ? 'bg-pastel-peach-bg text-pastel-peach-text'
                  : 'bg-surface-elevated text-text-muted'
              }`}
            >
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </div>
            {quickLight && (
              <Switch
                checked={quickLight.on}
                disabled={!quickLight.online}
                onChange={(on) => dispatchDeviceCommand(quickLight.id, { on })}
                aria-label={`Quick toggle ${quickLight.name}`}
              />
            )}
          </div>

          {quickLight ? (
            <div>
              <p className="text-xs font-medium text-text-muted truncate">{quickLight.name}</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-text tabular-nums">
                  {quickLight.on ? `${quickLight.brightness}%` : 'Off'}
                </span>
                <span className="text-[11px] text-text-muted">
                  {quickLight.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">No smart light configured</p>
          )}
        </Card>

        {/* Quick Card 3: Active Schedule */}
        <Card className="p-4 sm:p-5 bg-surface-card rounded-3xl flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="h-11 w-11 rounded-2xl bg-pastel-lavender-bg text-pastel-lavender-text flex items-center justify-center shrink-0">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </div>
            {quickSchedule && (
              <Switch
                checked={quickSchedule.enabled}
                onChange={() => onToggleSchedule(quickSchedule.id)}
                aria-label={`Toggle schedule ${quickSchedule.name}`}
              />
            )}
          </div>

          {quickSchedule ? (
            <div>
              <p className="text-xs font-medium text-text-muted truncate">
                {quickSchedule.name}
              </p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-text tabular-nums">
                  {quickSchedule.time}
                </span>
                <span className="text-[11px] text-text-muted">
                  {quickSchedule.enabled ? 'Scheduled' : 'Disabled'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">No schedule configured</p>
          )}
        </Card>
      </div>
    </div>
  );
};
