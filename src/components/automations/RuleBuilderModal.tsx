import React, { useState, useRef, useId } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { DimmerSlider } from '@/components/controls/DimmerSlider';
import { ColorPicker } from '@/components/controls/ColorPicker';
import { DryRunModal } from './DryRunModal';
import { validateRule, type RuleValidationError } from '@/engine/automation';
import type { Rule, Condition, Action, Device, ComparisonOperator, LogicalOperator } from '@/types';
import { Plus, Trash2, Play, AlertCircle } from 'lucide-react';

export interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  devices: Device[];
  initialRule?: Rule | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RuleBuilderModal: React.FC<RuleBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  devices,
  initialRule,
}) => {
  const isEditing = Boolean(initialRule);

  // Form states
  const [name, setName] = useState<string>(initialRule?.name ?? '');
  const [description, setDescription] = useState<string>(initialRule?.description ?? '');
  const [enabled, setEnabled] = useState<boolean>(initialRule?.enabled ?? true);
  const [logic, setLogic] = useState<LogicalOperator>(initialRule?.conditionGroup.logic ?? 'AND');

  const [conditions, setConditions] = useState<Condition[]>(() => {
    if (initialRule?.conditionGroup.conditions && initialRule.conditionGroup.conditions.length > 0) {
      return JSON.parse(JSON.stringify(initialRule.conditionGroup.conditions));
    }
    // Default initial condition
    const defaultDev = devices[0];
    return [
      {
        id: `cond-${Date.now()}-1`,
        deviceId: defaultDev?.id,
        field: 'on',
        operator: '==',
        value: true,
      },
    ];
  });

  const [actions, setActions] = useState<Action[]>(() => {
    if (initialRule?.actions && initialRule.actions.length > 0) {
      return JSON.parse(JSON.stringify(initialRule.actions));
    }
    // Default initial action
    const defaultLight = devices.find((d) => d.type === 'light') || devices[0];
    return [
      {
        id: `act-${Date.now()}-1`,
        deviceId: defaultLight?.id || '',
        field: 'on',
        value: true,
      },
    ];
  });

  // Time window state
  const [hasTimeWindow, setHasTimeWindow] = useState<boolean>(Boolean(initialRule?.timeWindow));
  const [startTime, setStartTime] = useState<string>(initialRule?.timeWindow?.start ?? '22:00');
  const [endTime, setEndTime] = useState<string>(initialRule?.timeWindow?.end ?? '06:00');

  // Weekdays state (empty = every day)
  const [weekdays, setWeekdays] = useState<number[]>(initialRule?.weekdays ?? []);

  // Cooldown minutes state
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(initialRule?.cooldownMinutes ?? 5);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<RuleValidationError[]>([]);
  const [dryRunOpen, setDryRunOpen] = useState<boolean>(false);

  // References to input elements for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Unique base ID for accessible descriptions
  const formId = useId();

  // Helper to build candidate rule
  const buildCandidateRule = (): Rule => {
    const candidate: Rule = {
      id: initialRule?.id || `rule-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      conditionGroup: {
        logic,
        conditions,
      },
      actions,
      timeWindow: hasTimeWindow ? { start: startTime, end: endTime } : undefined,
      weekdays: weekdays.length > 0 && weekdays.length < 7 ? weekdays : undefined,
      cooldownMinutes,
      createdAt: initialRule?.createdAt ?? Date.now(),
      modifiedAt: Date.now(),
    };
    return candidate;
  };

  // Condition Handlers
  const handleAddCondition = () => {
    const newCond: Condition = {
      id: `cond-${Date.now()}-${conditions.length + 1}`,
      deviceId: devices[0]?.id,
      field: 'on',
      operator: '==',
      value: true,
    };
    setConditions((prev) => [...prev, newCond]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConditionChange = (id: string, updates: Partial<Condition>) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Action Handlers
  const handleAddAction = () => {
    const defaultDev = devices.find((d) => d.type === 'light') || devices[0];
    const newAct: Action = {
      id: `act-${Date.now()}-${actions.length + 1}`,
      deviceId: defaultDev?.id || '',
      field: 'on',
      value: true,
    };
    setActions((prev) => [...prev, newAct]);
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleActionChange = (id: string, updates: Partial<Action>) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  // Weekday toggle
  const handleToggleWeekday = (dayIdx: number) => {
    setWeekdays((prev) => {
      if (prev.includes(dayIdx)) {
        return prev.filter((d) => d !== dayIdx);
      }
      return [...prev, dayIdx].sort((a, b) => a - b);
    });
  };

  // Validation helper
  const getFieldError = (fieldKey: string) => {
    return validationErrors.find((e) => e.field === fieldKey)?.message;
  };

  // Submit Handler
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const candidate = buildCandidateRule();
    const result = validateRule(candidate, devices);

    if (!result.valid) {
      setValidationErrors(result.errors);
      // Shift focus to the first error element
      const firstError = result.errors[0];
      if (firstError) {
        if (firstError.field === 'name') {
          nameInputRef.current?.focus();
        } else {
          const el = formContainerRef.current?.querySelector<HTMLElement>(
            `[name="${firstError.field}"], #${firstError.field}`
          );
          if (el) el.focus();
        }
      }
      return;
    }

    setValidationErrors([]);
    onSave(candidate);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? `Edit Automation: ${initialRule?.name}` : 'Create Automation Rule'}
        size="xl"
        description="Configure triggers, multi-condition logic, timed constraints, and automated device actions."
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDryRunOpen(true)}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Dry run simulation</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleSave}>
                {isEditing ? 'Save Changes' : 'Create Automation'}
              </Button>
            </div>
          </div>
        }
      >
        <div ref={formContainerRef} className="space-y-6">
          {/* Validation Summary Alert */}
          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-danger space-y-1.5"
            >
              <div className="flex items-center gap-2 font-semibold text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Please fix the following validation errors ({validationErrors.length}):</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1: General Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="rule-name-input"
                  className="block text-xs font-semibold text-text mb-1"
                >
                  Automation Name <span className="text-danger">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="rule-name-input"
                  name="name"
                  type="text"
                  placeholder="e.g. Night Eco Temperature"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.some((err) => err.field === 'name')) {
                      setValidationErrors((prev) => prev.filter((err) => err.field !== 'name'));
                    }
                  }}
                  aria-invalid={Boolean(getFieldError('name'))}
                  aria-describedby={getFieldError('name') ? `${formId}-name-err` : undefined}
                  className={`w-full px-3 py-2 text-sm bg-surface-elevated border rounded-lg text-text focus-ring ${
                    getFieldError('name') ? 'border-danger' : 'border-border'
                  }`}
                />
                {getFieldError('name') && (
                  <p id={`${formId}-name-err`} className="text-xs text-danger mt-1">
                    {getFieldError('name')}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="rule-desc-input"
                  className="block text-xs font-semibold text-text mb-1"
                >
                  Description (Optional)
                </label>
                <input
                  id="rule-desc-input"
                  type="text"
                  placeholder="e.g. Lowers thermostat and turns off chandelier at midnight"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-lg text-text focus-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border">
              <div>
                <span className="text-xs font-semibold text-text">Enabled State</span>
                <p className="text-[11px] text-text-muted">
                  Inactive automations will not trigger during live runtime simulation.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-text">
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={enabled}
                  onChange={setEnabled}
                  aria-label="Toggle automation rule enabled state"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Conditions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">Conditions (IF)</h3>
                <p className="text-[11px] text-text-muted">
                  Telemetry checks or device state prerequisites required for execution.
                </p>
              </div>
              {/* Logic Selector AND / OR */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-medium">Evaluate with:</span>
                <div
                  role="radiogroup"
                  aria-label="Condition evaluation logic"
                  className="inline-flex rounded-lg border border-border p-0.5 bg-surface-subtle"
                >
                  {(['AND', 'OR'] as LogicalOperator[]).map((op) => {
                    const isSelected = logic === op;
                    return (
                      <button
                        key={op}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setLogic(op)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          isSelected
                            ? 'bg-accent text-white shadow-xs'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {op}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-accent/90 italic">
              {logic === 'AND'
                ? 'All conditions must be satisfied simultaneously for the rule to trigger.'
                : 'Any single satisfied condition will trigger the automation actions.'}
            </p>

            {/* Condition Rows */}
            <div className="space-y-2.5">
              {conditions.map((cond, index) => {
                const devErr = getFieldError(`condition_${cond.id}_device`);
                const valErr = getFieldError(`condition_${cond.id}_value`);

                return (
                  <div
                    key={cond.id}
                    className="p-3 rounded-xl border border-border bg-surface-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text">Condition #{index + 1}</span>
                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(cond.id)}
                          aria-label={`Remove condition ${index + 1}`}
                          className="text-text-muted hover:text-danger p-1 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      {/* Kind / Device Picker */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Source Parameter / Device
                        </label>
                        <select
                          id={`condition_${cond.id}_device`}
                          name={`condition_${cond.id}_device`}
                          value={cond.deviceId ? `dev:${cond.deviceId}` : `env:${cond.field}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.startsWith('env:')) {
                              const field = val.replace('env:', '');
                              handleConditionChange(cond.id, {
                                deviceId: undefined,
                                field,
                                operator: '>',
                                value: field === 'ambientTemp' ? 24 : 50,
                              });
                            } else {
                              const devId = val.replace('dev:', '');
                              const dev = devices.find((d) => d.id === devId);
                              const defaultField = dev?.type === 'lock' ? 'locked' : 'on';
                              handleConditionChange(cond.id, {
                                deviceId: devId,
                                field: defaultField,
                                operator: '==',
                                value: true,
                              });
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
                        >
                          <optgroup label="Environmental Sensors">
                            <option value="env:ambientTemp">Indoor Temperature (°C)</option>
                            <option value="env:ambientHumidity">Indoor Humidity (%)</option>
                            <option value="env:powerWatts">Total Power Consumption (W)</option>
                          </optgroup>
                          <optgroup label="Smart Devices">
                            {devices.map((d) => (
                              <option key={d.id} value={`dev:${d.id}`}>
                                {d.name} ({d.type})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {devErr && <p className="text-[11px] text-danger mt-0.5">{devErr}</p>}
                      </div>

                      {/* Operator Picker */}
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Operator
                        </label>
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            handleConditionChange(cond.id, {
                              operator: e.target.value as ComparisonOperator,
                            })
                          }
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
                        >
                          <option value="==">equals (==)</option>
                          <option value="!=">not equals (!=)</option>
                          <option value=">">greater than (&gt;)</option>
                          <option value="<">less than (&lt;)</option>
                          <option value=">=">at least (&gt;=)</option>
                          <option value="<=">at most (&lt;=)</option>
                        </select>
                      </div>

                      {/* Expected Value */}
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Comparison Value
                        </label>
                        {typeof cond.value === 'boolean' ? (
                          <select
                            id={`condition_${cond.id}_value`}
                            name={`condition_${cond.id}_value`}
                            value={String(cond.value)}
                            onChange={(e) =>
                              handleConditionChange(cond.id, { value: e.target.value === 'true' })
                            }
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
                          >
                            <option value="true">True / On / Locked</option>
                            <option value="false">False / Off / Unlocked</option>
                          </select>
                        ) : (
                          <input
                            id={`condition_${cond.id}_value`}
                            name={`condition_${cond.id}_value`}
                            type="number"
                            step="0.5"
                            value={cond.value}
                            onChange={(e) =>
                              handleConditionChange(cond.id, {
                                value: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text font-mono focus-ring"
                          />
                        )}
                        {valErr && <p className="text-[11px] text-danger mt-0.5">{valErr}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Condition</span>
              </Button>
            </div>
          </div>

          {/* Section 3: Actions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Actions (THEN)</h3>
              <p className="text-[11px] text-text-muted">
                Commands dispatched when the rule transitions to eligible.
              </p>
            </div>

            <div className="space-y-3">
              {actions.map((act, index) => {
                const dev = devices.find((d) => d.id === act.deviceId);
                const devErr = getFieldError(`action_${act.id}_device`);
                const fieldErr = getFieldError(`action_${act.id}_field`);
                const valErr = getFieldError(`action_${act.id}_value`);

                return (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border border-border bg-surface-subtle space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text">Action #{index + 1}</span>
                      {actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(act.id)}
                          aria-label={`Remove action ${index + 1}`}
                          className="text-text-muted hover:text-danger p-1 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Target Device */}
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Target Device <span className="text-danger">*</span>
                        </label>
                        <select
                          id={`action_${act.id}_device`}
                          name={`action_${act.id}_device`}
                          value={act.deviceId}
                          onChange={(e) => {
                            const newDevId = e.target.value;
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
                            handleActionChange(act.id, {
                              deviceId: newDevId,
                              field: newField,
                              value: newVal,
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
                        >
                          {devices.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.type})
                            </option>
                          ))}
                        </select>
                        {devErr && <p className="text-[11px] text-danger mt-0.5">{devErr}</p>}
                      </div>

                      {/* Action Field */}
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Action Type
                        </label>
                        <select
                          id={`action_${act.id}_field`}
                          name={`action_${act.id}_field`}
                          value={act.field}
                          onChange={(e) => {
                            const f = e.target.value;
                            let v: string | number | boolean = true;
                            if (f === 'brightness') v = 50;
                            else if (f === 'color') v = '#3b82f6';
                            else if (f === 'target') v = 22;
                            handleActionChange(act.id, { field: f, value: v });
                          }}
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text focus-ring"
                        >
                          {dev?.type === 'light' && (
                            <>
                              <option value="on">Power On/Off</option>
                              <option value="brightness">Set Brightness (0-100%)</option>
                              <option value="color">Set Color Hex</option>
                            </>
                          )}
                          {dev?.type === 'thermostat' && (
                            <option value="target">Set Target Temperature (°C)</option>
                          )}
                          {dev?.type === 'lock' && (
                            <option value="locked">Lock / Unlock</option>
                          )}
                          {dev?.type === 'camera' && (
                            <>
                              <option value="active">Active Streaming On/Off</option>
                              <option value="privacyMode">Privacy Mode On/Off</option>
                              <option value="motionDetection">Motion Detection On/Off</option>
                            </>
                          )}
                        </select>
                        {fieldErr && <p className="text-[11px] text-danger mt-0.5">{fieldErr}</p>}
                      </div>
                    </div>

                    {/* Value Control */}
                    <div>
                      {act.field === 'on' || act.field === 'locked' || act.field === 'active' || act.field === 'privacyMode' || act.field === 'motionDetection' ? (
                        <div className="flex items-center gap-3">
                          <label className="text-[11px] font-medium text-text-muted">
                            Desired State:
                          </label>
                          <select
                            id={`action_${act.id}_value`}
                            name={`action_${act.id}_value`}
                            value={String(act.value)}
                            onChange={(e) =>
                              handleActionChange(act.id, { value: e.target.value === 'true' })
                            }
                            className="px-2 py-1 bg-surface border border-border rounded text-xs text-text focus-ring"
                          >
                            <option value="true">
                              {act.field === 'locked' ? 'Locked' : 'On / Active'}
                            </option>
                            <option value="false">
                              {act.field === 'locked' ? 'Unlocked' : 'Off / Inactive'}
                            </option>
                          </select>
                        </div>
                      ) : act.field === 'brightness' ? (
                        <div className="space-y-1">
                          <DimmerSlider
                            value={Number(act.value) || 0}
                            onCommit={(b: number) => handleActionChange(act.id, { value: b })}
                            ariaLabel="Brightness Target"
                          />
                        </div>
                      ) : act.field === 'color' ? (
                        <div className="space-y-1">
                          <ColorPicker
                            value={String(act.value || '#ffffff')}
                            onCommit={(hex: string) => handleActionChange(act.id, { value: hex })}
                          />
                        </div>
                      ) : act.field === 'target' ? (
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-text-muted">
                            Target Temp: {act.value}°C (Allowed range: 16°C - 30°C)
                          </label>
                          <input
                            id={`action_${act.id}_value`}
                            name={`action_${act.id}_value`}
                            type="range"
                            min="16"
                            max="30"
                            step="0.5"
                            value={Number(act.value) || 22}
                            onChange={(e) =>
                              handleActionChange(act.id, {
                                value: parseFloat(e.target.value) || 22,
                              })
                            }
                            className="w-full accent-accent"
                          />
                        </div>
                      ) : null}
                      {valErr && <p className="text-[11px] text-danger mt-1">{valErr}</p>}
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAction}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Action</span>
              </Button>
            </div>
          </div>

          {/* Section 4: Time Window, Weekdays & Cooldown */}
          <div className="space-y-4 pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-text">Timing & Cooldown Constraints</h3>

            {/* Time Window Switch & Inputs */}
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text">Time Window Filter</span>
                  <p className="text-[11px] text-text-muted">
                    Restrict rule execution to specific hours. Crossing midnight is supported.
                  </p>
                </div>
                <Switch
                  checked={hasTimeWindow}
                  onChange={setHasTimeWindow}
                  aria-label="Toggle time window filter"
                />
              </div>

              {hasTimeWindow && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50 text-xs">
                  <div>
                    <label htmlFor="timeWindow_start" className="block text-[11px] font-medium text-text-muted mb-1">
                      Start Time (Inclusive)
                    </label>
                    <input
                      id="timeWindow_start"
                      name="timeWindow_start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text font-mono focus-ring"
                    />
                    {getFieldError('timeWindow_start') && (
                      <p className="text-[11px] text-danger mt-0.5">{getFieldError('timeWindow_start')}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="timeWindow_end" className="block text-[11px] font-medium text-text-muted mb-1">
                      End Time (Exclusive)
                    </label>
                    <input
                      id="timeWindow_end"
                      name="timeWindow_end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-text font-mono focus-ring"
                    />
                    {getFieldError('timeWindow_end') && (
                      <p className="text-[11px] text-danger mt-0.5">{getFieldError('timeWindow_end')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Weekdays Selector */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Active Weekdays (Empty = Every Day)
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Active weekdays selection">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const isSelected = weekdays.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleToggleWeekday(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors focus-ring ${
                        isSelected
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface text-text-muted hover:text-text border-border'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cooldown Minutes Input */}
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
              <div>
                <label htmlFor="cooldownMinutes" className="text-xs font-semibold text-text block">
                  Execution Cooldown
                </label>
                <p className="text-[11px] text-text-muted">
                  Minimum wait time in minutes before this rule can re-trigger after firing.
                </p>
                {getFieldError('cooldownMinutes') && (
                  <p className="text-[11px] text-danger mt-0.5">{getFieldError('cooldownMinutes')}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  id="cooldownMinutes"
                  name="cooldownMinutes"
                  type="number"
                  min="0"
                  step="1"
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-20 px-2 py-1 text-sm bg-surface border border-border rounded font-mono text-text text-right focus-ring"
                />
                <span className="text-xs text-text-muted font-medium">min</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Dry Run Modal integration directly inside RuleBuilder */}
      {dryRunOpen && (
        <DryRunModal
          isOpen={dryRunOpen}
          onClose={() => setDryRunOpen(false)}
          rule={buildCandidateRule()}
        />
      )}
    </>
  );
};

