import React, { useState } from 'react';
import { useStore } from '@/store';
import { computeNextRun } from '@/engine/schedules';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { Switch } from '@/components/common/Switch';
import { Modal } from '@/components/common/Modal';
import { ScheduleEditorModal } from './ScheduleEditorModal';
import type { Schedule } from '@/types';
import { Plus, Edit2, Trash2, Clock, Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SchedulesTab: React.FC = () => {
  const schedules = useStore((s) => s.schedules);
  const scheduleExecutions = useStore((s) => s.scheduleExecutions);
  const devices = useStore((s) => s.devices);
  const virtualTime = useStore((s) => s.virtualTime ?? Date.now());

  const addSchedule = useStore((s) => s.addSchedule);
  const updateSchedule = useStore((s) => s.updateSchedule);
  const deleteSchedule = useStore((s) => s.deleteSchedule);
  const toggleSchedule = useStore((s) => s.toggleSchedule);

  // Modal states
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);

  const deviceMap = new Map(devices.map((d) => [d.id, d]));

  // Relative time helper for next run
  const formatNextRun = (schedule: Schedule): string => {
    if (!schedule.enabled) {
      return 'Not scheduled';
    }
    const nextRun = computeNextRun(schedule, virtualTime);
    if (!nextRun) {
      return 'Not scheduled';
    }
    const d = new Date(nextRun);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMs = nextRun - virtualTime;
    const diffHours = Math.round(diffMs / 3600000);

    let relativeStr = '';
    if (diffHours <= 1) {
      const diffMins = Math.max(1, Math.round(diffMs / 60000));
      relativeStr = `in ${diffMins}m`;
    } else if (diffHours < 24) {
      relativeStr = `in ${diffHours}h`;
    } else {
      const days = Math.round(diffHours / 24);
      relativeStr = `in ${days}d`;
    }

    return `${d.toLocaleDateString([], { weekday: 'short' })} at ${timeStr} (${relativeStr})`;
  };

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (sched: Schedule) => {
    setEditingSchedule(sched);
    setEditorOpen(true);
  };

  const handleSaveSchedule = (sched: Schedule) => {
    if (editingSchedule) {
      updateSchedule(sched.id, sched);
    } else {
      addSchedule(sched);
    }
  };

  const handleConfirmDelete = () => {
    if (scheduleToDelete) {
      deleteSchedule(scheduleToDelete.id);
      setScheduleToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text">Configured Schedules</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Wall-clock routines that trigger device state updates at predetermined times and weekdays.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4" />
          <span>New Schedule</span>
        </Button>
      </div>

      {/* Configured Schedules List */}
      {schedules.length === 0 ? (
        <Card className="p-8 text-center bg-surface border border-border">
          <Clock className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-text">No Schedules Configured</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Create recurring timed routines to automate your home on weekly or daily patterns.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={handleOpenCreate}>
              Create First Schedule
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((sched) => {
            const dev = deviceMap.get(sched.deviceId);
            const nextRunText = formatNextRun(sched);
            const daysLabel =
              sched.weekdays.length === 0 || sched.weekdays.length === 7
                ? 'Every day'
                : sched.weekdays.map((d) => WEEKDAY_NAMES[d] || d).join(', ');

            return (
              <Card
                key={sched.id}
                className="p-4 bg-surface border border-border flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-text">{sched.name}</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Target: <strong className="text-text">{dev?.name || sched.deviceId}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text">
                        {sched.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch
                        checked={sched.enabled}
                        onChange={() => toggleSchedule(sched.id)}
                        aria-label={`Toggle schedule ${sched.name}`}
                      />
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-surface-subtle border border-border/70 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-text">
                      <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono font-medium">{sched.time}</span>
                      <span className="text-text-muted">({daysLabel})</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Next Run: <strong className="text-text">{nextRunText}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(sched)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScheduleToDelete(sched)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                    <span>Delete</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Clearly Separated Executed Schedule Runs */}
      <div className="pt-6 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text">Executed Schedule Runs</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Historical log of timed schedule executions and skip events.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {scheduleExecutions.length} Recorded
          </Badge>
        </div>

        {scheduleExecutions.length === 0 ? (
          <div className="p-6 rounded-xl border border-border bg-surface-subtle text-center text-xs text-text-muted italic">
            Zero schedule executions recorded yet. Scheduled events will log here when fired.
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl bg-surface overflow-hidden">
            {scheduleExecutions.map((exec) => {
              const d = new Date(exec.firedAt);
              return (
                <div
                  key={exec.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {exec.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : exec.status === 'skipped' ? (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{exec.scheduleName}</span>
                        <Badge
                          variant={
                            exec.status === 'success'
                              ? 'success'
                              : exec.status === 'skipped'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {exec.status === 'success' ? 'Executed' : exec.status === 'skipped' ? 'Skipped' : 'Failed'}
                        </Badge>
                      </div>
                      <p className="text-text-muted mt-0.5">
                        Target: {exec.action.deviceId} ({exec.action.field}: {String(exec.action.value)})
                        {exec.result && ` — ${exec.result}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-text-muted text-[11px] shrink-0">
                    {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Editor Modal */}
      {editorOpen && (
        <ScheduleEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveSchedule}
          devices={devices}
          initialSchedule={editingSchedule}
        />
      )}

      {/* Delete Confirmation Modal */}
      {scheduleToDelete && (
        <Modal
          isOpen={Boolean(scheduleToDelete)}
          onClose={() => setScheduleToDelete(null)}
          title="Delete Schedule"
          size="sm"
          description={`Are you sure you want to delete schedule "${scheduleToDelete.name}"? This action cannot be undone.`}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setScheduleToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                Delete Schedule
              </Button>
            </div>
          }
        >
          <p className="text-xs text-text-muted">
            The schedule will immediately be removed and stop firing at its designated runtimes.
          </p>
        </Modal>
      )}
    </div>
  );
};

