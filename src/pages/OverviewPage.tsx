import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { useThrottledLiveTelemetry, useThrottledVirtualTime } from '@/hooks/useThrottledLiveTelemetry';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { RoomStageHero } from '@/components/overview/RoomStageHero';
import { ControlArcPanel } from '@/components/overview/ControlArcPanel';
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
  AlertTriangle,
  Play,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Thermometer,
  Lock,
  Unlock,
  Camera,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const colors = useChartTheme();

  const [isLoading] = useState(false);
  const [hydrationError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-living');
  const [controlTab, setControlTab] = useState<'thermostat' | 'light' | 'cameras'>('light');

  const running = useStore((s) => s.running);
  const virtualTime = useThrottledVirtualTime(1000);
  const setRunning = useStore((s) => s.setRunning);
  const resetToDefaults = useStore((s) => s.resetToDefaults);
  const devices = useStore((s) => s.devices);
  const rooms = useStore((s) => s.rooms);
  const rules = useStore((s) => s.rules);
  const schedules = useStore((s) => s.schedules);
  const toggleSchedule = useStore((s) => s.toggleSchedule);
  const demoHistory = useStore((s) => s.demoHistory);
  const liveTelemetry = useThrottledLiveTelemetry(1000);
  const events = useStore((s) => s.events);
  const anomalies = useStore((s) => s.anomalies);
  const executionHistory = useStore((s) => s.executionHistory);

  // Memoized state slice container for pure selector evaluations
  const storeSlice = useMemo(
    () =>
      ({
        devices,
        rooms,
        rules,
        schedules,
        running,
        virtualTime,
        demoHistory,
        liveTelemetry,
        events,
        anomalies,
        executionHistory,
      }) as unknown as Parameters<typeof selectTotalDevices>[0],
    [
      devices,
      rooms,
      rules,
      schedules,
      running,
      virtualTime,
      demoHistory,
      liveTelemetry,
      events,
      anomalies,
      executionHistory,
    ]
  );

  // Derive metrics via typed memoized selectors
  const totalDevices = selectTotalDevices(storeSlice);
  const onlineDevices = selectOnlineDevicesCount(storeSlice);
  const offlineDevices = selectOfflineDevicesCount(storeSlice);
  const activeAutomations = selectActiveAutomationsCount(storeSlice);
  const currentPowerWatts = selectCurrentPowerWatts(storeSlice);
  const todayEnergyKWh = selectTodayEnergyKWh(storeSlice);
  const indoorTemp = selectIndoorTemperature(storeSlice);
  const indoorHumidity = selectIndoorHumidity(storeSlice);
  const distribution = selectDeviceDistribution(storeSlice);
  const recentEvents = selectRecentEvents(storeSlice, 8);
  const activeAnomalies = selectRecentAnomalies(storeSlice, 5);
  const recentAutomations = selectRecentAutomations(storeSlice, 5);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

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
    const readings = [...demoHistory, ...liveTelemetry];
    readings.sort((a, b) => a.timestamp - b.timestamp);
    return readings;
  }, [demoHistory, liveTelemetry]);

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-surface rounded-3xl border border-border-subtle" />
          <div className="lg:col-span-4 h-96 bg-surface-elevated rounded-3xl border border-border-subtle" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Simulation Paused Warning Banner */}
      {!running && (
        <div
          role="region"
          aria-label="Simulation status warning"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl border border-warning/40 bg-warning/10 text-warning shadow-xs"
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
            className="shrink-0 gap-2 text-xs bg-warning hover:bg-warning/90 text-white dark:text-[#0B1012] border-none rounded-full px-4"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resume Simulation</span>
          </Button>
        </div>
      )}

      {/* Top Section: Overview Title & Engine Status Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">Overview</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Interactive room environment stage, live device telemetry, and automated home health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="green" size="md">
            Live Monitoring
          </Badge>
          <Badge variant={running ? 'success' : 'warning'} size="md">
            {running ? 'Engine Active' : 'Engine Paused'}
          </Badge>
        </div>
      </div>

      {/* Reference-2 Hero Asymmetric 2-Column Stage (8-col Left Stage + 4-col Right Control Panel) */}
      <section aria-label="Home environment stage and primary controls">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 min-w-0">
            <RoomStageHero
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              devices={devices}
              schedules={schedules}
              onToggleSchedule={toggleSchedule}
              todayEnergyKWh={todayEnergyKWh}
              indoorTemp={indoorTemp}
              indoorHumidity={indoorHumidity}
              onFocusControlTab={setControlTab}
            />
          </div>

          <div className="lg:col-span-4 min-w-0">
            <ControlArcPanel
              selectedRoom={selectedRoom}
              devices={devices}
              activeTab={controlTab}
              onTabChange={setControlTab}
              currentPowerWatts={currentPowerWatts}
              todayEnergyKWh={todayEnergyKWh}
              indoorTemp={indoorTemp}
              indoorHumidity={indoorHumidity}
            />
          </div>
        </div>
      </section>

      {/* Fleet Health Summary Bar (Completes all 8 typed selector KPIs) */}
      <section aria-label="System fleet metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex flex-col justify-between p-4 sm:p-5 bg-surface-card rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Total Devices</span>
              <Cpu className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-text tabular-nums">{totalDevices}</div>
              <p className="text-[11px] text-text-muted mt-0.5">Configured endpoints</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-4 sm:p-5 bg-surface-card rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Online</span>
              <Wifi className="h-4 w-4 text-success" aria-hidden="true" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-success tabular-nums">{onlineDevices}</div>
              <p className="text-[11px] text-text-muted mt-0.5">Connected &amp; active</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-4 sm:p-5 bg-surface-card rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Offline</span>
              <WifiOff className="h-4 w-4 text-danger" aria-hidden="true" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-danger tabular-nums">{offlineDevices}</div>
              <p className="text-[11px] text-text-muted mt-0.5">Unreachable hardware</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-4 sm:p-5 bg-surface-card rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Active Automations</span>
              <Sliders className="h-4 w-4 text-warning" aria-hidden="true" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-text tabular-nums">{activeAutomations}</div>
              <p className="text-[11px] text-text-muted mt-0.5">Enabled rule guards</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Connected Device Quick Grid */}
      <section aria-label="All connected devices" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-text">Device Overview</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Direct command controls routed through the simulation dispatcher across all rooms.
            </p>
          </div>
          <Link
            to="/rooms"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 rounded-xl px-2 py-1 focus-ring min-h-[44px] sm:min-h-[32px]"
          >
            <span>View All Devices</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {devices.length === 0 ? (
          <Card className="p-8 text-center bg-surface-card border border-dashed border-border rounded-3xl">
            <Sliders className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-text">No Devices Connected</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              The smart home has no active simulated devices. Restore demo devices to begin monitoring.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => resetToDefaults()}
            >
              Restore Demo Devices
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map((device) => {
            const roomName = roomMap.get(device.roomId) || 'Unassigned';

            let iconTileClass = 'bg-surface-elevated text-text';
            let DeviceIcon = Lightbulb;
            let currentStateText = '';

            if (device.type === 'light') {
              DeviceIcon = Lightbulb;
              iconTileClass = device.on
                ? 'bg-pastel-peach-bg text-pastel-peach-text'
                : 'bg-surface-elevated text-text-muted';
              currentStateText = device.on ? `${device.brightness}% brightness` : 'Off';
            } else if (device.type === 'thermostat') {
              DeviceIcon = Thermometer;
              iconTileClass = 'bg-pastel-blue-bg text-pastel-blue-text';
              currentStateText = `${device.target.toFixed(1)}°${device.unit} target (${device.current.toFixed(1)}°${device.unit})`;
            } else if (device.type === 'lock') {
              DeviceIcon = device.locked ? Lock : Unlock;
              iconTileClass = device.locked
                ? 'bg-pastel-green-bg text-pastel-green-text'
                : 'bg-pastel-peach-bg text-pastel-peach-text';
              currentStateText = device.locked ? 'Locked' : 'Unlocked';
            } else if (device.type === 'camera') {
              DeviceIcon = Camera;
              iconTileClass = 'bg-pastel-lavender-bg text-pastel-lavender-text';
              currentStateText = device.privacyMode
                ? 'Privacy Mode'
                : device.active
                ? 'Streaming'
                : 'Idle';
            }

            return (
              <Card
                key={device.id}
                className={`p-5 rounded-3xl flex flex-col justify-between transition-all duration-200 ${
                  device.online
                    ? 'bg-surface border-border-subtle hover:shadow-md'
                    : 'bg-surface-card border-border-subtle'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center shadow-xs ${iconTileClass}`}
                      aria-hidden="true"
                    >
                      <DeviceIcon className="h-5 w-5" />
                    </div>

                    <Badge
                      variant={device.online ? 'success' : 'danger'}
                      size="sm"
                      className="flex items-center gap-1 font-medium"
                    >
                      {device.online ? (
                        <Wifi className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <WifiOff className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{device.online ? 'Online' : 'Offline'}</span>
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold text-text text-sm truncate">{device.name}</h3>
                    <p className="text-xs text-text-muted truncate mt-0.5">{roomName}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-muted truncate">
                    {currentStateText}
                  </span>

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
                      <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label={`Temperature control for ${device.name}`}
                      >
                        <button
                          type="button"
                          disabled={!device.online || device.target <= device.min}
                          onClick={() =>
                            dispatchDeviceCommand(device.id, {
                              target: Math.max(device.min, device.target - 0.5),
                            })
                          }
                          className="h-10 w-10 sm:h-7 sm:w-7 rounded-full bg-surface-elevated border border-border-subtle text-text hover:bg-accent-subtle flex items-center justify-center font-bold text-xs focus-ring disabled:opacity-40"
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
                          className="h-10 w-10 sm:h-7 sm:w-7 rounded-full bg-surface-elevated border border-border-subtle text-text hover:bg-accent-subtle flex items-center justify-center font-bold text-xs focus-ring disabled:opacity-40"
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
        )}
      </section>

      {/* Energy & Status Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-surface border border-border-subtle rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-semibold text-text">Weekly Energy Consumption</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Today: <span className="font-semibold text-text tabular-nums">{todayEnergyKWh.toFixed(2)} kWh</span> • Current draw:{' '}
                  <span className="font-semibold text-text tabular-nums">{currentPowerWatts} W</span>
                </p>
              </div>
              <Badge variant="green" className="text-xs">
                7-Day Overview
              </Badge>
            </div>

            <div className="h-64 min-h-[260px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={colors.textMuted}
                    fontSize={11}
                    tickLine={false}
                    interval="preserveStartEnd"
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
                    wrapperStyle={{ zIndex: 50 }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      borderColor: colors.tooltipBorder,
                      borderRadius: '1rem',
                      color: colors.text,
                      fontSize: '12px',
                      boxShadow: '0 6px 20px rgba(14, 24, 28, 0.12)',
                    }}
                    itemStyle={{ color: colors.text }}
                    labelStyle={{ color: colors.textMuted, fontWeight: 600 }}
                    formatter={(value: number) => [`${value} kWh`, 'Energy']}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Bar
                    dataKey="kWh"
                    fill={colors.arcFill}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={44}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <details className="mt-3 text-xs text-text-muted">
            <summary className="cursor-pointer font-medium hover:text-text select-none focus-ring rounded inline-block">
              View energy data as table
            </summary>
            <div className="max-h-40 overflow-y-auto mt-2 border border-border-subtle rounded-xl">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Weekly Energy Breakdown</caption>
                <thead className="bg-surface-elevated border-b border-border-subtle text-[11px] font-semibold text-text">
                  <tr>
                    <th scope="col" className="p-2">Day</th>
                    <th scope="col" className="p-2">Energy (kWh)</th>
                    <th scope="col" className="p-2">Peak Draw (Watts)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono text-[11px]">
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

        <Card className="p-6 bg-surface border border-border-subtle rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-text">Device Distribution</h2>
              <Badge variant="outline" className="text-xs">
                {distribution.total} Total
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              {distribution.online} online (
              {distribution.total > 0
                ? Math.round((distribution.online / distribution.total) * 100)
                : 0}
              %), {distribution.offline} offline.
            </p>

            <div className="h-44 min-h-[176px] w-full mt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minHeight={176}>
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
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        name={entry.name}
                        aria-label={`${entry.name}: ${entry.value}`}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 50 }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      borderColor: colors.tooltipBorder,
                      borderRadius: '1rem',
                      color: colors.text,
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: colors.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2 pt-2 border-t border-border-subtle">
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
                        className="h-full bg-arc-fill rounded-full transition-all duration-300"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              summaryParts.push(`${thermo.current.toFixed(1)}°${thermo.unit}`);
            } else if (room.ambientTemp !== undefined) {
              summaryParts.push(`${room.ambientTemp.toFixed(1)}°C`);
            }
            if (onLightsCount > 0) {
              summaryParts.push(`${onLightsCount} light${onLightsCount > 1 ? 's' : ''} on`);
            } else {
              summaryParts.push('All lights off');
            }

            return (
              <Card
                key={room.id}
                className="p-5 rounded-3xl bg-surface border border-border-subtle flex flex-col justify-between hover:shadow-md transition-all duration-200"
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
        <Card className="p-6 bg-surface border border-border-subtle rounded-3xl flex flex-col justify-between">
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
                    className="flex items-start justify-between gap-2 p-2.5 rounded-2xl bg-surface-elevated/70 text-xs border border-border-subtle"
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

        <Card className="p-6 bg-surface border border-border-subtle rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
                <h2 className="text-base font-semibold text-text">Anomalies &amp; Alerts</h2>
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
                <CheckCircle2 className="h-8 w-8 text-success/70 mb-2" aria-hidden="true" />
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

        <Card className="p-6 bg-surface border border-border-subtle rounded-3xl flex flex-col justify-between">
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
                      className="p-3 rounded-2xl border border-border-subtle bg-surface-elevated/70 text-xs flex flex-col gap-1"
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
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              <span>Executed</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" aria-hidden="true" />
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
