import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { useChartTheme } from '@/hooks/useChartTheme';
import { useThrottledLiveTelemetry, useThrottledVirtualTime } from '@/hooks/useThrottledLiveTelemetry';
import { aggregateEnergy, detectAnomalies, DEFAULT_STD_FLOORS, type CustomDateRange } from '@/engine/energy';
import type { EnergyTimeRange } from '@/types';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Flame,
  Gauge,
  Calendar,
  AlertCircle,
  HelpCircle,
  Home,
  Laptop,
} from 'lucide-react';

const RANGES: EnergyTimeRange[] = ['1h', '24h', '7d', '30d', 'custom'];

export interface EnergyAnalyticsPageProps {
  renderSpy?: () => void;
}

export const EnergyAnalyticsPage: React.FC<EnergyAnalyticsPageProps> = ({ renderSpy }) => {
  renderSpy?.();

  const virtualTime = useThrottledVirtualTime(1000);
  const deviceNames = useStore((s) => s.devices.map((d) => `${d.id}:${d.name}`).join(';'));
  const roomNames = useStore((s) => s.rooms.map((r) => `${r.id}:${r.name}`).join(';'));
  const demoHistory = useStore((s) => s.demoHistory);
  const seed = useStore((s) => s.seed);
  const liveTelemetry = useThrottledLiveTelemetry(1000);
  const colors = useChartTheme();

  const [selectedRange, setSelectedRange] = useState<EnergyTimeRange>('24h');
  const [customStartStr, setCustomStartStr] = useState<string>('');
  const [customEndStr, setCustomEndStr] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  // Name lookup maps
  const deviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of deviceNames.split(';')) {
      if (!item) continue;
      const [id, name] = item.split(':');
      if (id && name) map.set(id, name);
    }
    return map;
  }, [deviceNames]);

  const roomNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of roomNames.split(';')) {
      if (!item) continue;
      const [id, name] = item.split(':');
      if (id && name) map.set(id, name);
    }
    return map;
  }, [roomNames]);

  // Combined readings: demoHistory + liveTelemetry
  const combinedReadings = useMemo(() => {
    if (demoHistory && demoHistory.length > 0) {
      return [...demoHistory, ...liveTelemetry];
    }
    return liveTelemetry;
  }, [demoHistory, liveTelemetry]);

  // Validated custom range
  const customRange = useMemo<CustomDateRange | undefined>(() => {
    if (selectedRange !== 'custom') return undefined;
    if (!customStartStr || !customEndStr) return undefined;

    const start = new Date(customStartStr).getTime();
    const end = new Date(customEndStr).getTime();

    if (isNaN(start) || isNaN(end)) {
      return undefined;
    }
    if (end <= start) {
      return undefined;
    }
    return { start, end };
  }, [selectedRange, customStartStr, customEndStr]);

  // Handle custom range input change with validation
  const handleCustomChange = (startStr: string, endStr: string) => {
    setCustomStartStr(startStr);
    setCustomEndStr(endStr);

    if (!startStr || !endStr) {
      setCustomError('Please provide both start and end timestamps.');
      return;
    }

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    if (isNaN(start) || isNaN(end)) {
      setCustomError('Invalid date format.');
      return;
    }
    if (end <= start) {
      setCustomError('End time must be strictly after start time.');
      return;
    }
    if (end > virtualTime + 60000) {
      setCustomError('End time cannot be in the future.');
      return;
    }
    const maxDurationMs = 90 * 24 * 3600 * 1000;
    if (end - start > maxDurationMs) {
      setCustomError('Custom range cannot exceed 90 days.');
      return;
    }

    setCustomError(null);
  };

  // Run pure aggregation from engine
  const aggregated = useMemo(() => {
    return aggregateEnergy(combinedReadings, selectedRange, virtualTime, customRange);
  }, [combinedReadings, selectedRange, virtualTime, customRange]);

  // Detect anomalies over the aggregated buckets using engine detectAnomalies
  const detectedAnomalies = useMemo(() => {
    if (aggregated.buckets.length === 0) return [];

    const series = aggregated.buckets.map((b) => ({
      timestamp: b.timestamp,
      value: b.averageWatts,
    }));

    return detectAnomalies(series, {
      metric: 'watts',
      stdFloor: DEFAULT_STD_FLOORS.watts,
      k: 2.5,
      minSamples: 4,
    });
  }, [aggregated]);

  const anomalyTimestampMap = useMemo(() => {
    const map = new Map<number, (typeof detectedAnomalies)[0]>();
    for (const anom of detectedAnomalies) {
      map.set(anom.timestamp, anom);
    }
    return map;
  }, [detectedAnomalies]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return aggregated.buckets.map((b) => {
      const d = new Date(b.timestamp);
      let timeLabel = '';
      if (selectedRange === '1h') {
        timeLabel = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } else if (selectedRange === '24h') {
        timeLabel = `${String(d.getHours()).padStart(2, '0')}:00`;
      } else if (selectedRange === '7d') {
        timeLabel = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
      } else {
        timeLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }

      const anom = anomalyTimestampMap.get(b.timestamp);

      return {
        timestamp: b.timestamp,
        time: timeLabel,
        fullDate: d.toLocaleString(),
        averageWatts: Math.round(b.averageWatts),
        peakWatts: Math.round(b.peakWatts),
        kWh: Number(b.kWh.toFixed(4)),
        baseline: anom ? anom.baseline : undefined,
        threshold: anom ? anom.threshold : undefined,
        isAnomaly: Boolean(anom),
        anomalyValue: anom ? anom.value : undefined,
      };
    });
  }, [aggregated, selectedRange, anomalyTimestampMap]);

  // Sorted Device Breakdown
  const deviceBreakdown = useMemo(() => {
    const total = aggregated.summary.totalKWh;
    return Object.entries(aggregated.summary.deviceKWh)
      .map(([id, kWh]) => {
        const name = deviceNameMap.get(id) || id;
        const pct = total > 0 ? (kWh / total) * 100 : 0;
        return { id, name, kWh, pct };
      })
      .sort((a, b) => b.kWh - a.kWh);
  }, [aggregated.summary, deviceNameMap]);

  // Sorted Room Breakdown
  const roomBreakdown = useMemo(() => {
    const total = aggregated.summary.totalKWh;
    return Object.entries(aggregated.summary.roomKWh)
      .map(([id, kWh]) => {
        const name = roomNameMap.get(id) || id;
        const pct = total > 0 ? (kWh / total) * 100 : 0;
        return { id, name, kWh, pct };
      })
      .sort((a, b) => b.kWh - a.kWh);
  }, [aggregated.summary, roomNameMap]);

  // Peak power timestamp
  const peakTimeStr = useMemo(() => {
    if (chartData.length === 0) return 'N/A';
    const peakBucket = chartData.reduce(
      (max, b) => (b.peakWatts > (max?.peakWatts ?? 0) ? b : max),
      chartData[0]
    );
    return peakBucket ? peakBucket.time : 'N/A';
  }, [chartData]);

  // Keyboard navigation for Range Radiogroup
  const handleRangeKeyDown = useCallback(
    (e: React.KeyboardEvent, currentRange: EnergyTimeRange) => {
      const idx = RANGES.indexOf(currentRange);
      let nextIdx = idx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % RANGES.length;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + RANGES.length) % RANGES.length;
        e.preventDefault();
      } else if (e.key === 'Home') {
        nextIdx = 0;
        e.preventDefault();
      } else if (e.key === 'End') {
        nextIdx = RANGES.length - 1;
        e.preventDefault();
      }
      if (nextIdx !== idx) {
        const next = RANGES[nextIdx];
        if (next) setSelectedRange(next);
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Seed Demo History Notice */}
      <div
        role="note"
        aria-label="Simulation dataset disclaimer"
        className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border text-xs text-text-muted"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          <span>
            <strong>Demo history, generated from seed.</strong> Live readings are simulated.
          </span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          Deterministic Seed {seed}
        </Badge>
      </div>

      {/* Header and Accessible Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Energy Analytics</h1>
          <p className="text-sm text-text-muted mt-1">
            Historical consumption, power curves, peak demands, and statistical anomaly detection.
          </p>
        </div>

        {/* Range Selector Radiogroup with Keyboard Support */}
        <div
          role="radiogroup"
          aria-label="Select energy analytics timeframe"
          className="flex items-center rounded-xl border border-border p-1 bg-surface shadow-xs"
        >
          {RANGES.map((r) => {
            const isSelected = selectedRange === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelectedRange(r)}
                onKeyDown={(e) => handleRangeKeyDown(e, r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase transition-colors ${isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-text-muted hover:text-text hover:bg-surface-subtle'
                  }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Inputs when range === 'custom' */}
      {selectedRange === 'custom' && (
        <Card className="p-4 bg-surface border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <span className="text-xs font-semibold text-text">Custom Time Range:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-text-muted flex items-center gap-1.5">
                <span>Start:</span>
                <input
                  type="datetime-local"
                  value={customStartStr}
                  onChange={(e) => handleCustomChange(e.target.value, customEndStr)}
                  className="px-2.5 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>

              <label className="text-xs text-text-muted flex items-center gap-1.5">
                <span>End:</span>
                <input
                  type="datetime-local"
                  value={customEndStr}
                  onChange={(e) => handleCustomChange(customStartStr, e.target.value)}
                  className="px-2.5 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
            </div>
          </div>

          {customError && (
            <div
              className="mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{customError}</span>
            </div>
          )}
        </Card>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total kWh */}
        <Card className="p-4 bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Total Consumption</span>
            <Gauge className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text tabular-nums">
            {aggregated.summary.totalKWh.toFixed(2)}{' '}
            <span className="text-xs font-normal text-text-muted">kWh</span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Aggregated in selected window</p>
        </Card>

        {/* Peak Power */}
        <Card className="p-4 bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Peak Demand</span>
            <Flame className="h-4 w-4 text-warning" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text tabular-nums">
            {aggregated.summary.peakWatts}{' '}
            <span className="text-xs font-normal text-text-muted">W</span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Highest point at {peakTimeStr}</p>
        </Card>

        {/* Average Power */}
        <Card className="p-4 bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Average Power</span>
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text tabular-nums">
            {aggregated.summary.averageWatts.toFixed(0)}{' '}
            <span className="text-xs font-normal text-text-muted">W</span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Continuous baseline load</p>
        </Card>

        {/* Anomalies Detected */}
        <Card className="p-4 bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Anomalies Detected</span>
            <AlertTriangle
              className={`h-4 w-4 ${detectedAnomalies.length > 0 ? 'text-danger' : 'text-success'}`}
              aria-hidden="true"
            />
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${detectedAnomalies.length > 0 ? 'text-danger' : 'text-success'
              }`}
          >
            {detectedAnomalies.length}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Statistical Gaussian outliers</p>
        </Card>
      </div>

      {/* Chart 1: Power Curve (W) with Baseline and Anomaly Markers */}
      <Card className="p-5 bg-surface border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div>
            <h2 className="text-base font-semibold text-text">Power Profile & Statistical Anomalies</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Power in Watts over {selectedRange} window. Peak demand: {aggregated.summary.peakWatts} W, Average: {aggregated.summary.averageWatts.toFixed(0)} W.
            </p>
          </div>

          {/* Visible Legend with Shape and Label (not color only) */}
          <div
            className="flex items-center gap-3 text-xs text-text-muted flex-wrap"
            role="region"
            aria-label="Chart legend"
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
              <span>Normal Power</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t-2 border-dashed border-text-muted" aria-hidden="true" />
              <span>Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rotate-45 bg-danger" aria-hidden="true" />
              <span className="font-semibold text-danger">◆ Anomaly Spike</span>
            </div>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-text-muted" role="status">
            Insufficient data available for this range selection.
          </div>
        ) : (
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="energyPowerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.accent} stopOpacity={0.35} />
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div
                          className="p-3 rounded-lg border shadow-lg text-xs"
                          style={{
                            backgroundColor: colors.tooltipBg,
                            borderColor: colors.tooltipBorder,
                            color: colors.text,
                          }}
                        >
                          <p className="font-semibold text-text">{data.fullDate}</p>
                          <p className="mt-1 font-mono text-accent">Power: {data.averageWatts} W</p>
                          {data.isAnomaly && (
                            <div className="mt-1.5 pt-1.5 border-t border-danger/30 text-danger">
                              <p className="font-semibold flex items-center gap-1">
                                <span>⚠️ Statistical Anomaly Detected</span>
                              </p>
                              <p className="font-mono text-[11px] mt-0.5">
                                Baseline: {data.baseline} W | Threshold: {data.threshold} W
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="averageWatts"
                  stroke={colors.accent}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#energyPowerGrad)"
                  isAnimationActive={false}
                />
                {/* Baseline line */}
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke={colors.textMuted}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Distinct Diamond Marker on Anomalies */}
                <Line
                  type="monotone"
                  dataKey="anomalyValue"
                  stroke="transparent"
                  dot={(props: { cx?: number; cy?: number; payload?: { isAnomaly?: boolean } }) => {
                    if (!props.payload?.isAnomaly || props.cx === undefined || props.cy === undefined) {
                      return <svg key={`dot-${props.cx}-${props.cy}`} />;
                    }
                    return (
                      <svg
                        key={`anom-${props.cx}-${props.cy}`}
                        x={props.cx - 6}
                        y={props.cy - 6}
                        width={12}
                        height={12}
                        aria-label="Power spike anomaly marker"
                      >
                        <rect
                          x={1}
                          y={1}
                          width={10}
                          height={10}
                          transform="rotate(45 6 6)"
                          fill={colors.danger}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      </svg>
                    );
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accessible Table Alternative for Power Profile */}
        <details className="mt-3 text-xs text-text-muted">
          <summary className="cursor-pointer font-medium hover:text-text select-none">
            View power data as table
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 border border-border rounded-lg">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Power Profile Table</caption>
              <thead className="bg-surface-subtle text-[11px] font-semibold text-text sticky top-0">
                <tr>
                  <th scope="col" className="p-2">Timestamp</th>
                  <th scope="col" className="p-2">Average (W)</th>
                  <th scope="col" className="p-2">Peak (W)</th>
                  <th scope="col" className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px] font-mono">
                {chartData.map((row) => (
                  <tr key={row.timestamp} className={row.isAnomaly ? 'bg-danger/10 text-danger' : ''}>
                    <td className="p-2">{row.time}</td>
                    <td className="p-2">{row.averageWatts} W</td>
                    <td className="p-2">{row.peakWatts} W</td>
                    <td className="p-2">{row.isAnomaly ? 'Anomaly Spike' : 'Normal'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      {/* Chart 2: Energy Consumption (kWh Bar Chart) */}
      <Card className="p-5 bg-surface border border-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-text">Energy Consumption (kWh)</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Accumulated kilowatt-hours per bucket. Total: {aggregated.summary.totalKWh.toFixed(2)} kWh.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {aggregated.buckets.length} Buckets
          </Badge>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-text-muted" role="status">
            Insufficient data available.
          </div>
        ) : (
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                  unit=" kWh"
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
                  formatter={(val: number) => [`${val.toFixed(4)} kWh`, 'Energy Consumption']}
                  labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullDate || ''}
                />
                <Bar
                  dataKey="kWh"
                  fill={colors.accent}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accessible Table Alternative for Energy Chart */}
        <details className="mt-3 text-xs text-text-muted">
          <summary className="cursor-pointer font-medium hover:text-text select-none">
            View energy data as table
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 border border-border rounded-lg">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Energy Consumption Table</caption>
              <thead className="bg-surface-subtle text-[11px] font-semibold text-text sticky top-0">
                <tr>
                  <th scope="col" className="p-2">Timestamp</th>
                  <th scope="col" className="p-2">Energy (kWh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px] font-mono">
                {chartData.map((row) => (
                  <tr key={row.timestamp}>
                    <td className="p-2">{row.time}</td>
                    <td className="p-2">{row.kWh} kWh</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      {/* Breakdowns: Per-Device & Per-Room (Mathematical Guarantee: Sum equals Total) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Per-Device Breakdown */}
        <Card className="p-5 bg-surface border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Laptop className="h-4 w-4 text-accent" aria-hidden="true" />
              <h2 className="text-base font-semibold text-text">Consumption by Device</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-text">
              Total: {aggregated.summary.totalKWh.toFixed(2)} kWh
            </span>
          </div>
          <p className="text-xs text-text-muted mb-4">
            Component distribution strictly summing to 100% of measured power.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {deviceBreakdown.map((dev) => (
              <div key={dev.id} className="text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text truncate max-w-[220px]">{dev.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-text font-semibold">{dev.kWh.toFixed(2)} kWh</span>
                    <span className="text-text-muted text-[11px]">({dev.pct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, dev.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Per-Room Breakdown */}
        <Card className="p-5 bg-surface border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-accent" aria-hidden="true" />
              <h2 className="text-base font-semibold text-text">Consumption by Room</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-text">
              Total: {aggregated.summary.totalKWh.toFixed(2)} kWh
            </span>
          </div>
          <p className="text-xs text-text-muted mb-4">
            Zonal usage distribution across interior and exterior spaces.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {roomBreakdown.map((room) => (
              <div key={room.id} className="text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text truncate max-w-[220px]">{room.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-text font-semibold">{room.kWh.toFixed(2)} kWh</span>
                    <span className="text-text-muted text-[11px]">({room.pct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, room.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Anomalies List Below Chart */}
      <Card className="p-5 bg-surface border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
            <h2 className="text-base font-semibold text-text">Statistical Anomalies Detected in Range</h2>
          </div>
          <Badge variant={detectedAnomalies.length > 0 ? 'danger' : 'outline'} className="text-xs">
            {detectedAnomalies.length} Flagged
          </Badge>
        </div>

        {detectedAnomalies.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center italic">
            Zero statistical anomalies detected within this selected range.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {detectedAnomalies.map((anom) => {
              const d = new Date(anom.timestamp);
              return (
                <div key={anom.timestamp} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="danger" size="sm" className="font-semibold uppercase text-[10px] shrink-0">
                      Spike
                    </Badge>
                    <span className="font-semibold text-text truncate">
                      Power surged to {anom.value} W
                    </span>
                    <span className="text-text-muted text-[11px]">
                      (Baseline: {anom.baseline} W, Threshold: {anom.threshold} W)
                    </span>
                  </div>
                  <span className="text-text-muted text-[11px] font-mono shrink-0">
                    {d.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
