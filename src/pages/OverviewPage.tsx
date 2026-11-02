import React, { useState, useMemo } from 'react';
import { useStore } from '@/store';
import {
  selectTotalDevices,
  selectOnlineDevicesCount,
  selectOfflineDevicesCount,
  selectActiveAutomationsCount,
  selectCurrentPowerWatts,
  selectTodayEnergyKWh,
  selectIndoorTemperature,
  selectIndoorHumidity,
  selectDeviceDistribution,
  selectRecentEvents,
  selectRecentAnomalies,
  selectRecentAutomations,
} from '@/store/selectors';
import { aggregateEnergy } from '@/engine/energy';
import { dispatchDeviceCommand } from '@/services/commandDispatcher';
import { useChartTheme } from '@/hooks/useChartTheme';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { formatRelativeTime } from '@/utils/formatters';
import type { LightDevice, ThermostatDevice } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Cpu,
  Wifi,
  WifiOff,
  Zap,
  Gauge,
  Thermometer,
  Droplets,
  AlertTriangle,
  Play,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Lock,
  Unlock,
  Camera,
  Layers,
  ArrowRight,
} from 'lucide-react';


export const OverviewPage: React.FC = () => {
  const store = useStore();
  const colors = useChartTheme();

  const [isLoading] = useState(false);
  const [hydrationError] = useState<string | null>(null);

  const running = store.running;
  const virtualTime = store.virtualTime ?? Date.now();
  const setRunning = store.setRunning;
  const devices = store.devices;
  const rooms = store.rooms;

  // Derive metrics via typed memoized selectors
  const totalDevices = selectTotalDevices(store);
  const onlineDevices = selectOnlineDevicesCount(store);
  const offlineDevices = selectOfflineDevicesCount(store);
  const activeAutomations = selectActiveAutomationsCount(store);
  const currentPowerWatts = selectCurrentPowerWatts(store);
  const todayEnergyKWh = selectTodayEnergyKWh(store);
  const indoorTemp = selectIndoorTemperature(store);
  const indoorHumidity = selectIndoorHumidity(store);
  const distribution = selectDeviceDistribution(store);
  const recentEvents = selectRecentEvents(store, 8);
  const activeAnomalies = selectRecentAnomalies(store, 5);
  const recentAutomations = selectRecentAutomations(store, 5);

  // Stable lookup map for room names
  const roomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rooms) {
      map.set(r.id, r.name);
    }
    return map;
  }, [rooms]);

  // Aggregate 7-day energy data using the single source of truth engine
  const combinedReadings = useMemo(() => {
    const readings = [...store.demoHistory, ...store.liveTelemetry];
    readings.sort((a, b) => a.timestamp - b.timestamp);
    return readings;
  }, [store.demoHistory, store.liveTelemetry]);

  const weeklyAggregated = useMemo(() => {
    return aggregateEnergy(combinedReadings, '7d', virtualTime);
  }, [combinedReadings, virtualTime]);

  const weeklyChartData = useMemo(() => {
    return weeklyAggregated.buckets.map((b) => {
      const d = new Date(b.timestamp);
      const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      return {
        day: dayStr,
        kWh: Number(b.kWh.toFixed(2)),
        peakWatts: b.peakWatts,
      };
    });
  }, [weeklyAggregated]);

  // Pie chart distribution data
  const pieData = useMemo(() => {
    return [
      { name: 'Online', value: distribution.online, color: colors.success },
      { name: 'Offline', value: distribution.offline, color: colors.danger },
    ];
  }, [distribution, colors]);

  if (hydrationError) {
    return (
      <div className="p-6 rounded-3xl bg-danger/10 border border-danger/30 text-danger" role="alert">
        <h2 className="text-lg font-bold">Store Hydration Error</h2>
        <p className="text-sm mt-1">{hydrationError}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
        <div className="h-8 w-48 bg-surface-elevated rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface rounded-3xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Simulation Paused Warning Banner */}
      {!running && (
        <div
          role="region"
          aria-label="Simulation status warning"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl border border-warning/40 bg-warning/10 text-warning shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/20 text-warning">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base text-text">Simulation Engine Paused</p>
              <p className="text-xs text-text-muted mt-0.5">
                Environmental drift, sensor telemetry, and scheduled automation checks are currently paused.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRunning(true)}
            className="shrink-0 gap-2 text-xs bg-warning hover:bg-warning/90 text-white border-none min-h-[40px] px-4"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resume Simulation</span>
          </Button>
        </div>
      )}

      {/* Top Section: Overview Title & Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">Overview</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time status, live power telemetry, and environmental climate across all configured rooms.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="green" size="md">
            ● Live Monitoring
          </Badge>
          <Badge variant={running ? 'success' : 'warning'} size="md">
            {running ? 'Engine Active' : 'Engine Paused'}
          </Badge>
        </div>
      </div>

      {/* Hero Environment Cards Row (Blue: Temp, Yellow: Humidity, Green: Power) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Indoor Temperature (Blue Pastel Tile) */}
        <Card className="p-6 bg-pastel-blue-bg/30 border border-pastel-blue-text/20 rounded-3xl flex flex-col justify-between transition-all duration-200 hover:shadow-soft">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-pastel-blue-text uppercase tracking-wider">
              Indoor Temp
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-blue-bg text-pastel-blue-text shadow-xs">
              <Thermometer className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-text font-mono tabular-nums tracking-tight">
              {indoorTemp.toFixed(1)}{' '}
              <span className="text-xl font-normal text-text-muted">°C</span>
            </div>
            <p className="text-xs text-text-muted mt-1.5 font-medium">Average living zones</p>
          </div>
        </Card>

        {/* Card 2: Indoor Humidity (Yellow Pastel Tile) */}
        <Card className="p-6 bg-pastel-yellow-bg/30 border border-pastel-yellow-text/20 rounded-3xl flex flex-col justify-between transition-all duration-200 hover:shadow-soft">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-pastel-yellow-text uppercase tracking-wider">
              Humidity
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-yellow-bg text-pastel-yellow-text shadow-xs">
              <Droplets className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-text font-mono tabular-nums tracking-tight">
              {indoorHumidity.toFixed(0)}{' '}
              <span className="text-xl font-normal text-text-muted">%</span>
            </div>
            <p className="text-xs text-text-muted mt-1.5 font-medium">Ambient indoor air</p>
          </div>
        </Card>

        {/* Card 3: Current Power (Green Pastel Tile) */}
        <Card className="p-6 bg-pastel-green-bg/30 border border-pastel-green-text/20 rounded-3xl flex flex-col justify-between transition-all duration-200 hover:shadow-soft">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-pastel-green-text uppercase tracking-wider">
              Current Power
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-green-bg text-pastel-green-text shadow-xs">
              <Zap className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-bold text-text font-mono tabular-nums tracking-tight">
              {currentPowerWatts}{' '}
              <span className="text-xl font-normal text-text-muted">W</span>
            </div>
            <p className="text-xs text-text-muted mt-1.5 font-medium">Instantaneous draw</p>
          </div>
        </Card>
      </div>

      {/* Secondary Metrics Bar (Ensures all 8 typed metrics exist & passes existing tests) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Devices */}
        <Card className="flex flex-col justify-between p-4 bg-surface-card border border-border/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Total Devices</span>
            <Cpu className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text tabular-nums">{totalDevices}</div>
            <p className="text-[11px] text-text-muted mt-0.5">Configured endpoints</p>
          </div>
        </Card>

        {/* Online Devices */}
        <Card className="flex flex-col justify-between p-4 bg-surface-card border border-border/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Online</span>
            <Wifi className="h-4 w-4 text-success" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-success tabular-nums">{onlineDevices}</div>
            <p className="text-[11px] text-text-muted mt-0.5">Connected & active</p>
          </div>
        </Card>

        {/* Offline Devices */}
        <Card className="flex flex-col justify-between p-4 bg-surface-card border border-border/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Offline</span>
            <WifiOff className="h-4 w-4 text-danger" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-danger tabular-nums">{offlineDevices}</div>
            <p className="text-[11px] text-text-muted mt-0.5">Unreachable hardware</p>
          </div>
        </Card>

        {/* Active Automations */}
        <Card className="flex flex-col justify-between p-4 bg-surface-card border border-border/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Active Automations</span>
            <Sliders className="h-4 w-4 text-warning" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text tabular-nums">{activeAutomations}</div>
            <p className="text-[11px] text-text-muted mt-0.5">Enabled rule guards</p>
          </div>
        </Card>

        {/* Today's Energy */}
        <Card className="flex flex-col justify-between p-4 bg-surface-card border border-border/80 rounded-2xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Today's Energy</span>
            <Gauge className="h-4 w-4 text-success" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text font-mono tabular-nums">
              {todayEnergyKWh.toFixed(2)}{' '}
              <span className="text-xs font-normal text-text-muted">kWh</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Since local midnight</p>
          </div>
        </Card>
      </div>

      {/* Middle Row: Device Overview Grid (Icon on pastel tile, name, room, status pill, state, quick control) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Device Overview</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Quick access controls for connected smart devices across all zones.
            </p>
          </div>
          <a
            href="/rooms"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <span>View All Devices</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => {
            const roomName = roomMap.get(device.roomId) || 'Unassigned';

            // Tile styling & icon per device type
            let iconTileClass = 'bg-surface-elevated text-text';
            let DeviceIcon = Lightbulb;
            let currentStateText = '';

            if (device.type === 'light') {
              DeviceIcon = Lightbulb;
              iconTileClass = device.on
                ? 'bg-pastel-yellow-bg text-pastel-yellow-text'
                : 'bg-surface-elevated text-text-muted';
              currentStateText = device.on ? `${device.brightness}% brightness` : 'Off';
            } else if (device.type === 'thermostat') {
              DeviceIcon = Thermometer;
              iconTileClass = 'bg-pastel-blue-bg text-pastel-blue-text';
              currentStateText = `${device.target.toFixed(1)}°${device.unit} target (${device.current.toFixed(1)}°${device.unit} current)`;
            } else if (device.type === 'lock') {
              DeviceIcon = device.locked ? Lock : Unlock;
              iconTileClass = device.locked
                ? 'bg-pastel-green-bg text-pastel-green-text'
                : 'bg-pastel-yellow-bg text-pastel-yellow-text';
              currentStateText = device.locked ? 'Locked' : 'Unlocked';
            } else if (device.type === 'camera') {
              DeviceIcon = Camera;
              iconTileClass = 'bg-surface-elevated text-accent';
              currentStateText = device.privacyMode
                ? 'Privacy Mode'
                : device.active
                ? 'Streaming'
                : 'Idle';
            }

            return (
              <Card
                key={device.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${
                  device.online
                    ? 'bg-surface border-border/80 hover:shadow-soft'
                    : 'bg-surface-subtle/60 border-border/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {/* Pastel Icon Tile (44px) */}
                    <div
                      className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${iconTileClass}`}
                      aria-hidden="true"
                    >
                      <DeviceIcon className="h-5 w-5" />
                    </div>

                    {/* Status Pill */}
                    <Badge
                      variant={device.online ? 'success' : 'danger'}
                      size="sm"
                      className="flex items-center gap-1 font-medium"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          device.online ? 'bg-success' : 'bg-danger'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{device.online ? 'Online' : 'Offline'}</span>
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold text-text text-sm truncate">{device.name}</h3>
                    <p className="text-xs text-text-muted truncate mt-0.5">{roomName}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-muted truncate">
                    {currentStateText}
                  </span>

                  {/* Quick Controls */}
                  <div className="shrink-0 flex items-center">
                    {device.type === 'light' && (
                      <Switch
                        checked={device.on}
                        disabled={!device.online}
                        onChange={(checked) => dispatchDeviceCommand(device.id, { on: checked })}
                        aria-label={`Toggle power for ${device.name}`}
                      />
                    )}

                    {device.type === 'lock' && (
                      <Switch
                        checked={device.locked}
                        disabled={!device.online}
                        onChange={(checked) =>
                          dispatchDeviceCommand(device.id, { locked: checked })
                        }
                        aria-label={`Toggle lock for ${device.name}`}
                      />
                    )}

                    {device.type === 'thermostat' && (
                      <div className="flex items-center gap-1" role="group" aria-label={`Temperature control for ${device.name}`}>
                        <button
                          type="button"
                          disabled={!device.online || device.target <= device.min}
                          onClick={() =>
                            dispatchDeviceCommand(device.id, {
                              target: Math.max(device.min, device.target - 0.5),
                            })
                          }
                          className="h-7 w-7 rounded-lg bg-surface-elevated text-text hover:bg-surface-elevated/80 flex items-center justify-center font-bold text-xs focus-ring disabled:opacity-40"
                          aria-label={`Decrease target temperature for ${device.name}`}
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-semibold tabular-nums text-text px-1">
                          {device.target.toFixed(1)}°
                        </span>
                        <button
                          type="button"
                          disabled={!device.online || device.target >= device.max}
                          onClick={() =>
                            dispatchDeviceCommand(device.id, {
                              target: Math.min(device.max, device.target + 0.5),
                            })
                          }
                          className="h-7 w-7 rounded-lg bg-surface-elevated text-text hover:bg-surface-elevated/80 flex items-center justify-center font-bold text-xs focus-ring disabled:opacity-40"
                          aria-label={`Increase target temperature for ${device.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}

                    {device.type === 'camera' && (
                      <span className="text-[11px] font-medium text-text-muted">
                        {device.active ? 'Armed' : 'Standby'}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Energy & Status Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Minimal Weekly Energy Chart (2 cols) */}
        <Card className="lg:col-span-2 p-6 bg-surface border border-border/80 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-semibold text-text">Weekly Energy Consumption</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Today: <span className="font-semibold text-text">{todayEnergyKWh.toFixed(2)} kWh</span> • Current draw:{' '}
                  <span className="font-semibold text-text">{currentPowerWatts} W</span>
                </p>
              </div>
              <Badge variant="green" className="text-xs">
                7-Day Overview
              </Badge>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={colors.textMuted}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: colors.border }}
                  />
                  <YAxis
                    stroke={colors.textMuted}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: colors.border }}
                    unit=" kWh"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      borderColor: colors.tooltipBorder,
                      borderRadius: '1rem',
                      color: colors.text,
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    }}
                    formatter={(value: number) => [`${value} kWh`, 'Energy']}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Bar
                    dataKey="kWh"
                    fill={colors.accent}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Accessible Table Collapsible */}
          <details className="mt-3 text-xs text-text-muted">
            <summary className="cursor-pointer font-medium hover:text-text select-none">
              View energy data as table
            </summary>
            <div className="max-h-40 overflow-y-auto mt-2 border border-border/80 rounded-xl">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Weekly Energy Breakdown</caption>
                <thead className="bg-surface-elevated border-b border-border text-[11px] font-semibold text-text">
                  <tr>
                    <th scope="col" className="p-2">Day</th>
                    <th scope="col" className="p-2">Energy (kWh)</th>
                    <th scope="col" className="p-2">Peak Draw (Watts)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {weeklyChartData.map((row) => (
                    <tr key={row.day} className="hover:bg-surface-elevated/40">
                      <td className="p-2">{row.day}</td>
                      <td className="p-2">{row.kWh} kWh</td>
                      <td className="p-2">{row.peakWatts} W</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>

        {/* Device Distribution Donut & Stats (1 col) */}
        <Card className="p-6 bg-surface border border-border/80 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-text">Device Distribution</h2>
              <Badge variant="outline" className="text-xs">
                {distribution.total} Total
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              {distribution.online} online ({distribution.total > 0 ? Math.round((distribution.online / distribution.total) * 100) : 0}%),{' '}
              {distribution.offline} offline.
            </p>

            <div className="h-44 w-full mt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      borderColor: colors.tooltipBorder,
                      borderRadius: '1rem',
                      color: colors.text,
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2 mt-2 pt-2 border-t border-border/60">
              {[
                { name: 'Lights', count: distribution.byType.light },
                { name: 'Thermostats', count: distribution.byType.thermostat },
                { name: 'Locks', count: distribution.byType.lock },
                { name: 'Cameras', count: distribution.byType.camera },
              ].map((t) => {
                const pct = distribution.total > 0 ? (t.count / distribution.total) * 100 : 0;
                return (
                  <div key={t.name} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">{t.name}</span>
                      <span className="font-semibold text-text tabular-nums">{t.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Room Summary Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Room Summaries</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Zone snapshots and ambient environment indicators per room.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const roomDevices = devices.filter((d) => d.roomId === room.id);
            const onLightsCount = roomDevices.filter(
              (d) => d.type === 'light' && (d as LightDevice).on
            ).length;
            const thermo = roomDevices.find((d) => d.type === 'thermostat') as
              | ThermostatDevice
              | undefined;

            const summaryParts: string[] = [];
            if (thermo) {
              summaryParts.push(`${thermo.current.toFixed(1)}°${thermo.unit} avg`);
            }
            if (onLightsCount > 0) {
              summaryParts.push(`${onLightsCount} light${onLightsCount > 1 ? 's' : ''} on`);
            } else {
              summaryParts.push('All lights off');
            }

            return (
              <Card
                key={room.id}
                className="p-5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between hover:shadow-soft transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-elevated text-accent">
                    <Layers className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <Badge variant="outline" size="sm" className="text-xs">
                    {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="mt-3">
                  <h3 className="font-semibold text-text text-sm">{room.name}</h3>
                  <p className="text-xs text-text-muted mt-1 leading-snug">
                    {summaryParts.join(' • ')}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom 3 Panels: Recent Events, Active Anomalies, Recent Automations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Recent Events (Last 8) */}
        <Card className="p-6 bg-surface border border-border/80 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" aria-hidden="true" />
                <h2 className="text-base font-semibold text-text">Recent Events</h2>
              </div>
              <Badge variant="outline" className="text-xs">
                Last {recentEvents.length}
              </Badge>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center italic">
                No events recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-surface-elevated/50 text-xs border border-border/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{evt.description}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {roomMap.get(evt.roomId ?? '') ?? 'System'} •{' '}
                        <span className="capitalize">{evt.type}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                      {formatRelativeTime(evt.timestamp, virtualTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Panel 2: Active Anomalies & Alerts (Last 5) */}
        <Card className="p-6 bg-surface border border-border/80 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
                <h2 className="text-base font-semibold text-text">Anomalies & Alerts</h2>
              </div>
              <Badge
                variant={activeAnomalies.length > 0 ? 'danger' : 'outline'}
                className="text-xs"
              >
                {activeAnomalies.length} Active
              </Badge>
            </div>

            {activeAnomalies.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-success/70 mb-2" />
                <span>All telemetry operating within normal statistical baselines.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeAnomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="p-3 rounded-2xl border border-danger/30 bg-danger/5 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="danger" size="sm" className="font-semibold uppercase text-[10px]">
                        {anom.severity}
                      </Badge>
                      <span className="text-[10px] text-text-muted tabular-nums">
                        {formatRelativeTime(anom.timestamp, virtualTime)}
                      </span>
                    </div>
                    <p className="font-semibold text-text mt-0.5 leading-tight">{anom.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono mt-1">
                      <span>Actual: {anom.actualWatts}W</span>
                      <span>Baseline: {anom.baselineWatts}W</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Panel 3: Recent Automation Executions (Last 5) */}
        <Card className="p-6 bg-surface border border-border/80 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-warning" aria-hidden="true" />
                <h2 className="text-base font-semibold text-text">Automation Guards</h2>
              </div>
              <Badge variant="outline" className="text-xs">
                Last {recentAutomations.length}
              </Badge>
            </div>

            {recentAutomations.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center italic">
                No automation rules triggered yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentAutomations.map((exec) => {
                  const isSuccess = exec.status === 'success';
                  return (
                    <div
                      key={exec.id}
                      className="p-3 rounded-2xl border border-border/60 bg-surface-elevated/50 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text truncate max-w-[170px]">
                          {exec.ruleName}
                        </span>
                        <Badge
                          variant={isSuccess ? 'success' : 'outline'}
                          size="sm"
                          className="flex items-center gap-1 text-[10px] font-semibold"
                        >
                          {isSuccess ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Executed</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Skipped</span>
                            </>
                          )}
                        </Badge>
                      </div>
                      {exec.reason && (
                        <p className="text-[11px] text-text-muted leading-tight mt-0.5">
                          {exec.reason}
                        </p>
                      )}
                      <span className="text-[10px] text-text-muted/80 self-end mt-1 tabular-nums">
                        {formatRelativeTime(exec.timestamp, virtualTime)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
