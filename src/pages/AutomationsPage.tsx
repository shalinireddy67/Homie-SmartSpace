import React, { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Switch } from '@/components/common/Switch';
import { Modal } from '@/components/common/Modal';
import { RuleBuilderModal } from '@/components/automations/RuleBuilderModal';
import { DryRunModal } from '@/components/automations/DryRunModal';
import { SchedulesTab } from '@/components/automations/SchedulesTab';
import { ExecutionHistoryTab } from '@/components/automations/ExecutionHistoryTab';
import { formatRuleSummary, getNextEligibleState } from '@/components/automations/RuleSummary';
import type { Rule } from '@/types';
import {
  Sparkles,
  Plus,
  Play,
  Edit2,
  Copy,
  Trash2,
  Zap,
  Clock,
  History,
} from 'lucide-react';

export type AutomationsTab = 'rules' | 'schedules' | 'history';

export const AutomationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AutomationsTab>('rules');

  const rules = useStore((s) => s.rules);
  const devices = useStore((s) => s.devices);
  const virtualTime = useStore((s) => s.virtualTime ?? Date.now());
  const executionHistory = useStore((s) => s.executionHistory);

  const addRule = useStore((s) => s.addRule);
  const updateRule = useStore((s) => s.updateRule);
  const deleteRule = useStore((s) => s.deleteRule);
  const toggleRule = useStore((s) => s.toggleRule);

  // Modals
  const [builderOpen, setBuilderOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [dryRunRuleData, setDryRunRuleData] = useState<Rule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);

  // Map of last execution per rule
  const lastExecutionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const exec of executionHistory) {
      const existing = map.get(exec.ruleId);
      if (!existing || exec.timestamp > existing) {
        map.set(exec.ruleId, exec.timestamp);
      }
    }
    return map;
  }, [executionHistory]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setBuilderOpen(true);
  };

  const handleOpenEdit = (rule: Rule) => {
    setEditingRule(rule);
    setBuilderOpen(true);
  };

  const handleDuplicate = (rule: Rule) => {
    const duplicated: Rule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    addRule(duplicated);
  };

  const handleSaveRule = (saved: Rule) => {
    if (editingRule) {
      updateRule(saved.id, saved);
    } else {
      addRule(saved);
    }
  };

  const handleConfirmDelete = () => {
    if (ruleToDelete) {
      deleteRule(ruleToDelete.id);
      setRuleToDelete(null);
    }
  };

  // Demo helper: Load demo automation
  const handleLoadDemoAutomation = () => {
    const therm = devices.find((d) => d.type === 'thermostat') || devices[0];
    const light = devices.find((d) => d.type === 'light') || devices[1] || devices[0];

    const demoRule: Rule = {
      id: `rule-demo-${Date.now()}`,
      name: 'Eco Climate & Lighting',
      description: 'Raises AC target when temperature exceeds 23°C and adjusts evening lighting.',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: `cond-temp-${Date.now()}`,
            field: 'ambientTemp',
            operator: '>',
            value: 23,
          },
        ],
      },
      actions: [
        ...(therm
          ? [
              {
                id: `act-therm-${Date.now()}`,
                deviceId: therm.id,
                field: 'target',
                value: 21,
              },
            ]
          : []),
        ...(light
          ? [
              {
                id: `act-light-${Date.now()}`,
                deviceId: light.id,
                field: 'brightness',
                value: 40,
              },
            ]
          : []),
      ],
      timeWindow: {
        start: '08:00',
        end: '23:00',
      },
      cooldownMinutes: 2,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    addRule(demoRule);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Automations</h1>
          <p className="text-sm text-text-muted mt-1">
            Build event-driven rules, schedule routines, and test simulated triggers in isolation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadDemoAutomation}
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Load Demo Automation</span>
          </Button>
          {activeTab === 'rules' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
            >
              <Plus className="h-4 w-4" />
              <span>New Rule</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        role="tablist"
        aria-label="Automations sections"
        className="flex items-center gap-2 border-b border-border/80 pb-px overflow-x-auto scrollbar-none"
      >
        <button
          role="tab"
          id="tab-rules"
          aria-selected={activeTab === 'rules'}
          aria-controls="panel-rules"
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 focus-ring rounded-t-xl ${
            activeTab === 'rules'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text hover:border-border'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Rules</span>
          <Badge variant={activeTab === 'rules' ? 'accent' : 'outline'} size="sm">
            {rules.length}
          </Badge>
        </button>

        <button
          role="tab"
          id="tab-schedules"
          aria-selected={activeTab === 'schedules'}
          aria-controls="panel-schedules"
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 focus-ring rounded-t-xl ${
            activeTab === 'schedules'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text hover:border-border'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Schedules</span>
        </button>

        <button
          role="tab"
          id="tab-history"
          aria-selected={activeTab === 'history'}
          aria-controls="panel-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 focus-ring rounded-t-xl ${
            activeTab === 'history'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text hover:border-border'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Execution History</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'rules' && (
        <section
          id="panel-rules"
          role="tabpanel"
          aria-labelledby="tab-rules"
          className="space-y-4"
        >
          {rules.length === 0 ? (
            <Card className="p-10 text-center bg-surface border border-border/80 rounded-3xl">
              <Zap className="h-10 w-10 text-accent mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-text">No Automation Rules Configured</h3>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                Automations listen for environmental changes, sensor drift, and device state transitions to trigger automatic multi-device actions.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  Create Automation Rule
                </Button>
                <Button variant="outline" size="sm" onClick={handleLoadDemoAutomation}>
                  Load Ready Demo Automation
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rules.map((rule) => {
                const summary = formatRuleSummary(rule, devices);
                const nextEligible = getNextEligibleState(rule, virtualTime);
                const lastExec = lastExecutionMap.get(rule.id);
                const lastExecStr = lastExec
                  ? new Date(lastExec).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never';

                return (
                  <Card
                    key={rule.id}
                    className="p-5 sm:p-6 bg-surface border border-border/80 rounded-2xl shadow-xs hover:shadow-soft flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all duration-200"
                  >
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base font-bold text-text truncate max-w-sm">
                          {rule.name}
                        </h3>

                        {/* Next-eligible State Badge */}
                        <Badge
                          variant={
                            nextEligible.status === 'ready'
                              ? 'success'
                              : nextEligible.status === 'cooldown'
                              ? 'warning'
                              : 'outline'
                          }
                          size="sm"
                        >
                          {nextEligible.label}
                        </Badge>
                      </div>

                      {rule.description && (
                        <p className="text-xs text-text-muted">{rule.description}</p>
                      )}

                      {/* One-line IF ... THEN ... Summary */}
                      <p className="text-xs font-mono font-medium text-text bg-surface-elevated p-3 rounded-xl border border-border/70 break-words">
                        {summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted">
                        <span>
                          Last Executed: <strong className="text-text font-mono tabular-nums">{lastExecStr}</strong>
                        </span>
                        <span>
                          Cooldown: <strong className="text-text font-mono tabular-nums">{rule.cooldownMinutes}m</strong>
                        </span>
                        {rule.timeWindow && (
                          <span>
                            Window: <strong className="text-text font-mono tabular-nums">{rule.timeWindow.start} - {rule.timeWindow.end}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
                      {/* Real Text Enabled Switch */}
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs font-semibold text-text">
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Switch
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          aria-label={`Toggle rule ${rule.name}`}
                        />
                      </div>

                      {/* Dry Run Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDryRunRuleData(rule)}
                      >
                        <Play className="h-3.5 w-3.5 text-accent" />
                        <span>Dry run</span>
                      </Button>

                      {/* Edit Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(rule)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Button>

                      {/* Duplicate Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(rule)}
                        title="Duplicate rule"
                        aria-label={`Duplicate rule ${rule.name}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Duplicate</span>
                      </Button>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRuleToDelete(rule)}
                        title="Delete rule"
                        aria-label={`Delete rule ${rule.name}`}
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
        </section>
      )}

      {activeTab === 'schedules' && (
        <section id="panel-schedules" role="tabpanel" aria-labelledby="tab-schedules">
          <SchedulesTab />
        </section>
      )}

      {activeTab === 'history' && (
        <section id="panel-history" role="tabpanel" aria-labelledby="tab-history">
          <ExecutionHistoryTab />
        </section>
      )}

      {/* Rule Builder Modal */}
      {builderOpen && (
        <RuleBuilderModal
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onSave={handleSaveRule}
          devices={devices}
          initialRule={editingRule}
        />
      )}

      {/* Dry Run Modal */}
      {dryRunRuleData && (
        <DryRunModal
          isOpen={Boolean(dryRunRuleData)}
          onClose={() => setDryRunRuleData(null)}
          rule={dryRunRuleData}
        />
      )}

      {/* Delete Rule Confirm Modal */}
      {ruleToDelete && (
        <Modal
          isOpen={Boolean(ruleToDelete)}
          onClose={() => setRuleToDelete(null)}
          title="Delete Automation Rule"
          size="sm"
          description={`Are you sure you want to delete "${ruleToDelete.name}"? This action cannot be undone.`}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setRuleToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                Delete Rule
              </Button>
            </div>
          }
        >
          <p className="text-xs text-text-muted">
            The automation will be permanently removed from your dashboard and will cease evaluating during runtime.
          </p>
        </Modal>
      )}
    </div>
  );
};
