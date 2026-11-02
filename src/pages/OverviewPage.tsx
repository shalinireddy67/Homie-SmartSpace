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
import { useChartTheme } from '@/hooks/useChartTheme';
import { useThrottledLiveTelemetry } from '@/hooks/useThrottledLiveTelemetry';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatRelativeTime } from '@/utils/formatters';
import {
  AreaChart,
  Area,
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
  Activity,
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
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const store = useStore();
  const colors = useChartTheme();
  const throttledTelemetry = useThrottledLiveTelemetry(1000);

  const [isLoading] = useState(false);
  const [hydrationError] = useState<string | null>(null);

  const running = store.running;
  const virtualTime = store.virtualTime ?? Date.now();
  const setRunning = store.setRunning;

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

  // Format throttled live telemetry series for Recharts (last 5 minutes)
  const liveSeries = useMemo(() => {
    return throttledTelemetry.slice(-60).map((pt) => {
      const d = new Date(pt.timestamp);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      return {
        time: timeStr,
        timestamp: pt.timestamp,
        watts: pt.totalWatts,
      };
    });
  }, [throttledTelemetry]);

  const livePeakWatts = useMemo(() => {
    if (liveSeries.length === 0) return currentPowerWatts;
    return Math.max(...liveSeries.map((s) => s.watts), currentPowerWatts);
  }, [liveSeries, currentPowerWatts]);

  // Distribution chart data
  const pieData = useMemo(() => {
    return [
      { name: 'Online', value: distribution.online, color: colors.success },
      { name: 'Offline', value: distribution.offline, color: colors.danger },
    ];
  }, [distribution, colors]);

  // Type composition data
  const typeData = useMemo(() => {
    return [
      { name: 'Lights', count: distribution.byType.light },
      { name: 'Thermostats', count: distribution.byType.thermostat },
      { name: 'Locks', count: distribution.byType.lock },
      { name: 'Cameras', count: distribution.byType.camera },
    ];
  }, [distribution]);

  if (hydrationError) {
    return (
      <div className="p-6 rounded-xl bg-danger/10 border border-danger/30 text-danger" role="alert">
        <h2 className="text-lg font-bold">Store Hydration Error</h2>
        <p className="text-sm mt-1">{hydrationError}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
        <div className="h-8 w-48 bg-surface-subtle rounded-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simulation Paused Warning Banner */}
      {!running && (
        <div
          role="region"
          aria-label="Simulation status warning"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-warning/40 bg-warning/10 text-warning"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">Simulation Engine Paused</p>
              <p className="text-xs text-warning/90 mt-0.5">
                Environmental drift, sensor telemetry, and scheduled automation checks are currently paused.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRunning(true)}
            className="shrink-0 gap-1.5 text-xs bg-warning hover:bg-warning/90 text-white border-none"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resume Simulation</span>
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Overview Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time status, live power telemetry, and environmental climate across all configured rooms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent">Live Monitoring</Badge>
          <Badge variant={running ? 'success' : 'warning'}>
            {running ? 'Engine Running' : 'Engine Paused'}
          </Badge>
        </div>
      </div>

      {/* 8 Typed Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Devices */}
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
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
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Online</span>
            <Wifi className="h-4 w-4 text-success" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-success tabular-nums">{onlineDevices}</div>
            <p className="text-[11px] text-text-muted mt-0.5">Connected and active</p>
          </div>
        </Card>

        {/* Offline Devices */}
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
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
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Active Automations</span>
            <Zap className="h-4 w-4 text-warning" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text tabular-nums">{activeAutomations}</div>
            <p className="text-[11px] text-text-muted mt-0.5">Enabled rule guards</p>
          </div>
        </Card>

        {/* Current Power */}
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Current Power</span>
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text font-mono tabular-nums">
              {currentPowerWatts} <span className="text-sm font-normal text-text-muted">W</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Instantaneous draw</p>
          </div>
        </Card>

        {/* Today's Energy */}
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Today's Energy</span>
            <Gauge className="h-4 w-4 text-success" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text font-mono tabular-nums">
              {todayEnergyKWh.toFixed(2)}{' '}
              <span className="text-sm font-normal text-text-muted">kWh</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Since local midnight</p>
          </div>
        </Card>

        {/* Indoor Temperature */}
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Indoor Temp</span>
            <Thermometer className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text font-mono tabular-nums">
              {indoorTemp.toFixed(1)}{' '}
              <span className="text-sm font-normal text-text-muted">°C</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Average living zones</p>
          </div>
        </Card>

        {/* Indoor Humidity */}
        <Card className="flex flex-col justify-between p-4 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Humidity</span>
            <Droplets className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text font-mono tabular-nums">
              {indoorHumidity.toFixed(0)}{' '}
              <span className="text-sm font-normal text-text-muted">%</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Ambient indoor air</p>
          </div>
        </Card>
      </div>

      {/* Middle Row: Live Power Telemetry (Last 5 min) & Device Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Power Chart (2 cols) */}
        <Card className="lg:col-span-2 p-5 bg-surface border border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold text-text">Live Power Consumption</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Last 5 minutes telemetry stream. Peak: {livePeakWatts} W, Current:{' '}
                {currentPowerWatts} W.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              5m Window
            </Badge>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveSeries}>
                <defs>
                  <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.accent} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={colors.accent} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
                <XAxis
                  dataKey="time"
                  stroke={colors.textMuted}
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke={colors.textMuted}
                  fontSize={11}
                  tickLine={false}
                  unit=" W"
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.tooltipBg,
                    borderColor: colors.tooltipBorder,
                    borderRadius: '0.5rem',
                    color: colors.text,
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} W`, 'Power Draw']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="watts"
                  stroke={colors.accent}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#powerGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible Table View Collapsible */}
          <details className="mt-3 text-xs text-text-muted">
            <summary className="cursor-pointer font-medium hover:text-text select-none">
              View data as table
            </summary>
            <div className="max-h-40 overflow-y-auto mt-2 border border-border rounded-lg">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Live Power Readings (last 5 minutes)</caption>
                <thead className="bg-surface-subtle border-b border-border text-[11px] font-semibold text-text">
                  <tr>
                    <th scope="col" className="p-2">Timestamp</th>
                    <th scope="col" className="p-2">Power (Watts)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {liveSeries.slice(-10).map((row) => (
                    <tr key={row.timestamp} className="hover:bg-surface-subtle/50">
                      <td className="p-2">{row.time}</td>
                      <td className="p-2">{row.watts} W</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>

        {/* Device Distribution & Breakdown (1 col) */}
        <Card className="p-5 bg-surface border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-text">Device Distribution</h2>
              <Badge variant="outline" className="text-xs">
                {distribution.total} Total
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              {distribution.online} online ({Math.round((distribution.online / distribution.total) * 100)}%),{' '}
              {distribution.offline} offline across all rooms.
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
                      borderRadius: '0.5rem',
                      color: colors.text,
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Type Breakdown Bar List */}
            <div className="space-y-2 mt-2 pt-2 border-t border-border/60">
              {typeData.map((t) => {
                const pct = distribution.total > 0 ? (t.count / distribution.total) * 100 : 0;
                return (
                  <div key={t.name} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">{t.name}</span>
                      <span className="font-semibold text-text tabular-nums">{t.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
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

          {/* Accessible Table Collapsible */}
          <details className="mt-3 text-xs text-text-muted">
            <summary className="cursor-pointer font-medium hover:text-text select-none">
              View data as table
            </summary>
            <table className="w-full text-left border-collapse mt-2 border border-border rounded-lg">
              <caption className="sr-only">Device Status Distribution</caption>
              <thead className="bg-surface-subtle text-[11px] font-semibold text-text">
                <tr>
                  <th scope="col" className="p-1.5">Category</th>
                  <th scope="col" className="p-1.5">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                <tr>
                  <td className="p-1.5">Online</td>
                  <td className="p-1.5 font-mono">{distribution.online}</td>
                </tr>
                <tr>
                  <td className="p-1.5">Offline</td>
                  <td className="p-1.5 font-mono">{distribution.offline}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </Card>
      </div>

      {/* Bottom 3 Panels: Recent Events, Active Anomalies, Recent Automations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Recent Events (Last 8) */}
        <Card className="p-5 bg-surface border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
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
              <div className="space-y-3">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg bg-surface-subtle/60 text-xs border border-border/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{evt.description}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {evt.roomId ?? 'System'} • <span className="capitalize">{evt.type}</span>
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
        <Card className="p-5 bg-surface border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
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
                <CheckCircle2 className="h-6 w-6 text-success/60 mb-2" />
                <span>All telemetry operating within normal statistical baselines.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAnomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="p-2.5 rounded-lg border border-danger/30 bg-danger/5 text-xs flex flex-col gap-1"
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
        <Card className="p-5 bg-surface border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
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
              <div className="space-y-3">
                {recentAutomations.map((exec) => {
                  const isSuccess = exec.status === 'success';
                  return (
                    <div
                      key={exec.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-surface-subtle/50 text-xs flex flex-col gap-1"
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
