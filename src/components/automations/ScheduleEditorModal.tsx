import React, { useState, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { DimmerSlider } from '@/components/controls/DimmerSlider';
import { ColorPicker } from '@/components/controls/ColorPicker';
import { validateSchedule, computeNextRun } from '@/engine/schedules';
import type { Schedule, Action, Device } from '@/types';
import { AlertCircle } from 'lucide-react';

export interface ScheduleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Schedule) => void;
  devices: Device[];
  initialSchedule?: Schedule | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  devices,
  initialSchedule,
}) => {
  const isEditing = Boolean(initialSchedule);

  const [name, setName] = useState<string>(initialSchedule?.name ?? '');
  const [enabled, setEnabled] = useState<boolean>(initialSchedule?.enabled ?? true);
  const [time, setTime] = useState<string>(initialSchedule?.time ?? '07:30');
  const [weekdays, setWeekdays] = useState<number[]>(
    initialSchedule?.weekdays ?? [1, 2, 3, 4, 5] // default weekdays Mon-Fri
  );

  const defaultDev = devices[0];
  const [deviceId, setDeviceId] = useState<string>(initialSchedule?.deviceId ?? defaultDev?.id ?? '');
  const [action, setAction] = useState<Action>(() => {
    if (initialSchedule?.action) {
      return { ...initialSchedule.action };
    }
    const targetDev = devices.find((d) => d.id === deviceId) || defaultDev;
    let field = 'on';
    let value: string | number | boolean = true;
    if (targetDev?.type === 'thermostat') {
      field = 'target';
      value = 22;
    } else if (targetDev?.type === 'lock') {
      field = 'locked';
      value = true;
    }
    return {
      id: `act-${Date.now()}`,
      deviceId: targetDev?.id || '',
      field,
      value,
    };
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleToggleWeekday = (dayIdx: number) => {
    setWeekdays((prev) => {
      if (prev.includes(dayIdx)) {
        return prev.filter((d) => d !== dayIdx);
      }
      return [...prev, dayIdx].sort((a, b) => a - b);
    });
  };

  const handleDeviceChange = (newDevId: string) => {
    setDeviceId(newDevId);
    const newDev = devices.find((d) => d.id === newDevId);
    let newField = 'on';
    let newVal: string | number | boolean = true;
    if (newDev?.type === 'thermostat') {
      newField = 'target';
      newVal = 22;
    } else if (newDev?.type === 'lock') {
      newField = 'locked';
      newVal = true;
    }
    setAction({
      id: action.id,
      deviceId: newDevId,
      field: newField,
      value: newVal,
    });
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const candidate: Schedule = {
      id: initialSchedule?.id || `sched-${Date.now()}`,
      name: name.trim(),
      enabled,
      deviceId,
      action: {
        ...action,
        deviceId,
      },
      time,
      weekdays,
      nextRunTime: 0,
      createdAt: initialSchedule?.createdAt ?? Date.now(),
      modifiedAt: Date.now(),
    };

    const res = validateSchedule(candidate, devices);
    if (!res.valid) {
      setValidationErrors(res.errors);
      nameInputRef.current?.focus();
      return;
    }

    const nextRun = computeNextRun(candidate, Date.now()) ?? 0;
    candidate.nextRunTime = nextRun;

    setValidationErrors([]);
    onSave(candidate);
    onClose();
  };

  const targetDev = devices.find((d) => d.id === deviceId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Schedule: ${initialSchedule?.name}` : 'Create Timed Schedule'}
      size="lg"
      description="Automate device commands on fixed wall-clock times and recurring weekdays."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {validationErrors.length > 0 && (
          <div
            role="alert"
            className="p-3 rounded-xl border border-danger/40 bg-danger/10 text-danger space-y-1 text-xs"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please fix the following validation errors:</span>
            </div>
            <ul className="list-disc list-inside pl-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label htmlFor="sched-name" className="block text-xs font-semibold text-text mb-1">
            Schedule Name <span className="text-danger">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="sched-name"
            type="text"
            placeholder="e.g. Morning Porch Lights Off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-lg text-text focus-ring"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sched-time" className="block text-xs font-semibold text-text mb-1">
              Execution Time (24h) <span className="text-danger">*</span>
            </label>
            <input
              id="sched-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-lg text-text font-mono focus-ring"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border">
            <div>
              <span className="text-xs font-semibold text-text">Enabled State</span>
              <p className="text-[11px] text-text-muted">Will fire at scheduled slot.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text">{enabled ? 'Enabled' : 'Disabled'}</span>
              <Switch checked={enabled} onChange={setEnabled} aria-label="Toggle schedule enabled state" />
            </div>
          </div>
        </div>

        {/* Weekdays */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Repeat On Weekdays (Empty = Every Day)
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schedule weekday selection">
            {WEEKDAY_LABELS.map((dayLabel, idx) => {
              const isSelected = weekdays.includes(idx);
              return (
                <button
                  key={dayLabel}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleToggleWeekday(idx)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors focus-ring ${
                    isSelected
                      ? 'bg-accent text-white border-accent shadow-xs'
                      : 'bg-surface text-text-muted hover:text-text border-border'
                  }`}
                >
                  {dayLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Device & Action */}
        <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-3">
          <h4 className="text-xs font-semibold text-text uppercase tracking-wider">Scheduled Command</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="sched-device" className="block text-[11px] font-medium text-text-muted mb-0.5">
                Target Device
              </label>
              <select
                id="sched-device"
                value={deviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sched-field" className="block text-[11px] font-medium text-text-muted mb-0.5">
                Action Field
              </label>
              <select
                id="sched-field"
                value={action.field}
                onChange={(e) => {
                  const f = e.target.value;
                  let v: string | number | boolean = true;
                  if (f === 'brightness') v = 50;
                  else if (f === 'color') v = '#3b82f6';
                  else if (f === 'target') v = 22;
                  setAction((prev) => ({ ...prev, field: f, value: v }));
                }}
                className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
              >
                {targetDev?.type === 'light' && (
                  <>
                    <option value="on">Turn On / Off</option>
                    <option value="brightness">Set Brightness (0-100%)</option>
                    <option value="color">Set Color Hex</option>
                  </>
                )}
                {targetDev?.type === 'thermostat' && (
                  <option value="target">Set Target Temperature (°C)</option>
                )}
                {targetDev?.type === 'lock' && (
                  <option value="locked">Lock / Unlock</option>
                )}
                {targetDev?.type === 'camera' && (
                  <>
                    <option value="active">Active On/Off</option>
                    <option value="privacyMode">Privacy Mode On/Off</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Action Value Control */}
          <div className="pt-1 text-xs">
            {action.field === 'on' || action.field === 'locked' || action.field === 'active' || action.field === 'privacyMode' ? (
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium text-text-muted">Desired State:</label>
                <select
                  value={String(action.value)}
                  onChange={(e) => setAction((prev) => ({ ...prev, value: e.target.value === 'true' }))}
                  className="px-2 py-1 bg-surface border border-border rounded text-xs text-text focus-ring"
                >
                  <option value="true">{action.field === 'locked' ? 'Locked' : 'On / Active'}</option>
                  <option value="false">{action.field === 'locked' ? 'Unlocked' : 'Off / Inactive'}</option>
                </select>
              </div>
            ) : action.field === 'brightness' ? (
              <DimmerSlider
                value={Number(action.value) || 0}
                onCommit={(b: number) => setAction((prev) => ({ ...prev, value: b }))}
                ariaLabel="Target Brightness"
              />
            ) : action.field === 'color' ? (
              <ColorPicker
                value={String(action.value || '#ffffff')}
                onCommit={(hex: string) => setAction((prev) => ({ ...prev, value: hex }))}
              />
            ) : action.field === 'target' ? (
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">
                  Target Temperature: {action.value}°C (16°C - 30°C)
                </label>
                <input
                  type="range"
                  min="16"
                  max="30"
                  step="0.5"
                  value={Number(action.value) || 22}
                  onChange={(e) => setAction((prev) => ({ ...prev, value: parseFloat(e.target.value) || 22 }))}
                  className="w-full accent-accent"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};

