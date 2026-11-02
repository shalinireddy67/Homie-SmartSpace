import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  ExternalLink,
  Search,
} from 'lucide-react';

export interface UnifiedExecutionItem {
  id: string;
  sourceType: 'rule' | 'schedule';
  sourceName: string;
  sourceId: string;
  timestamp: number;
  status: 'success' | 'failure' | 'skipped';
  reason: string;
  targetDeviceId?: string;
  matchingEventId?: string;
}

export const ExecutionHistoryTab: React.FC = () => {
  const executionHistory = useStore((s) => s.executionHistory);
  const scheduleExecutions = useStore((s) => s.scheduleExecutions);
  const devices = useStore((s) => s.devices);
  const events = useStore((s) => s.events);

  const deviceMap = useMemo(() => new Map(devices.map((d) => [d.id, d.name])), [devices]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'skipped' | 'failure'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Merge and sort newest first
  const unifiedItems: UnifiedExecutionItem[] = useMemo(() => {
    const list: UnifiedExecutionItem[] = [];

    // 1. Rule executions
    for (const r of executionHistory) {
      // Find potential matching log event
      const matchingEvt = events.find((e) => e.automationId === r.ruleId && Math.abs(e.timestamp - r.timestamp) < 2000);
      const targetDevId = r.actionsExecuted[0]?.deviceId;

      list.push({
        id: r.id,
        sourceType: 'rule',
        sourceName: r.ruleName,
        sourceId: r.ruleId,
        timestamp: r.timestamp,
        status: r.status,
        reason: r.reason || (r.status === 'success' ? 'Rule executed successfully' : 'Execution skipped'),
        targetDeviceId: targetDevId,
        matchingEventId: matchingEvt?.id,
      });
    }

    // 2. Schedule executions
    for (const s of scheduleExecutions) {
      list.push({
        id: s.id,
        sourceType: 'schedule',
        sourceName: s.scheduleName,
        sourceId: s.scheduleId,
        timestamp: s.firedAt,
        status: s.status,
        reason: s.result || (s.status === 'success' ? 'Scheduled command fired' : 'Schedule skipped'),
        targetDeviceId: s.action.deviceId,
        matchingEventId: undefined,
      });
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [executionHistory, scheduleExecutions, events]);

  // Unique source names for filter dropdown
  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    for (const item of unifiedItems) {
      set.add(item.sourceName);
    }
    return Array.from(set).sort();
  }, [unifiedItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Source filter
      if (sourceFilter !== 'all' && item.sourceName !== sourceFilter) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.sourceName.toLowerCase().includes(q);
        const matchesReason = item.reason.toLowerCase().includes(q);
        const matchesDev = item.targetDeviceId && (deviceMap.get(item.targetDeviceId) || item.targetDeviceId).toLowerCase().includes(q);
        if (!matchesName && !matchesReason && !matchesDev) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedItems, statusFilter, sourceFilter, searchQuery, deviceMap]);

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text">Execution History</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Unified audit trail of automated trigger decisions and scheduled routine runs.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
          {filteredItems.length} of {unifiedItems.length} Records
        </Badge>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-border/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, reason, device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-elevated border border-border/80 rounded-xl text-text focus-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="filter-status-select" className="text-text-muted font-medium">Status:</label>
            <select
              id="filter-status-select"
              aria-label="Filter execution history by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-2.5 py-2 bg-surface-elevated border border-border/80 rounded-xl text-xs text-text focus-ring font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="success">Executed (Success)</option>
              <option value="skipped">Skipped</option>
              <option value="failure">Failed</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="filter-source-select" className="text-text-muted font-medium">Rule/Schedule:</label>
            <select
              id="filter-source-select"
              aria-label="Filter execution history by source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-2 bg-surface-elevated border border-border/80 rounded-xl text-xs text-text focus-ring max-w-[160px] truncate font-medium"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Execution List */}
      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center bg-surface border border-border">
          <History className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-text">No Execution Records Found</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {unifiedItems.length === 0
              ? 'Automation rules and schedules will log execution results, skipped reasons, and dispatched commands here.'
              : 'No items match your active status or search filters.'}
          </p>
        </Card>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl bg-surface shadow-xs overflow-hidden">
          {filteredItems.map((item) => {
            const d = new Date(item.timestamp);
            const devName = item.targetDeviceId ? deviceMap.get(item.targetDeviceId) || item.targetDeviceId : undefined;

            return (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-surface-subtle/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {item.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  ) : item.status === 'skipped' ? (
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text text-sm">{item.sourceName}</span>
                      <Badge
                        variant={item.sourceType === 'rule' ? 'accent' : 'outline'}
                        size="sm"
                        className="uppercase text-[10px]"
                      >
                        {item.sourceType}
                      </Badge>
                      <Badge
                        variant={
                          item.status === 'success'
                            ? 'success'
                            : item.status === 'skipped'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {item.status === 'success' ? 'Executed' : item.status === 'skipped' ? 'Skipped' : 'Failed'}
                      </Badge>
                    </div>

                    <p className="text-text-muted text-xs font-mono">{item.reason}</p>

                    {/* Links to Device and Event */}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                      {item.targetDeviceId && (
                        <Link
                          to="/rooms"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          <span>Device: {devName}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {item.matchingEventId ? (
                        <Link
                          to="/history"
                          className="inline-flex items-center gap-1 text-text-muted hover:text-text hover:underline"
                        >
                          <span>Event Log</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <Link
                          to="/history"
                          className="inline-flex items-center gap-1 text-text-muted hover:text-text hover:underline"
                        >
                          <span>View Event History</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <span className="font-mono text-text-muted text-[11px] block">
                    {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
