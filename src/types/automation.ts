/**
 * Automation rules and schedule domain models.
 */

export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

export interface Condition {
  id: string;
  deviceId?: string;
  field: string;
  operator: ComparisonOperator;
  value: string | number | boolean;
}

export type LogicalOperator = 'AND' | 'OR';

export interface ConditionGroup {
  logic: LogicalOperator;
  conditions: Condition[];
}

export interface Action {
  id: string;
  deviceId: string;
  field: string;
  value: string | number | boolean;
}

export interface TimeWindow {
  start: string; // HH:mm format, 24-hour
  end: string; // HH:mm format, 24-hour
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditionGroup: ConditionGroup;
  actions: Action[];
  timeWindow?: TimeWindow;
  weekdays?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  cooldownMinutes: number;
  lastTriggeredAt?: number;
  createdAt: number;
  modifiedAt: number;
}

export interface Schedule {
  id: string;
  name: string;
  enabled: boolean;
  deviceId: string;
  action: Action;
  time: string; // HH:mm format, 24-hour
  weekdays: number[]; // 0 = Sunday, ..., 6 = Saturday
  nextRunTime: number;
  createdAt: number;
  modifiedAt: number;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: number;
  status: 'success' | 'failure' | 'skipped';
  reason?: string;
  actionsExecuted: Action[];
}
