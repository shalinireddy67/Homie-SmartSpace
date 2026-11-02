import { StateCreator } from 'zustand';
import type { Rule, Schedule, AutomationExecution, ScheduleExecution } from '@/types';

/** Maximum bounded execution history items to prevent memory bloat */
export const MAX_AUTOMATION_EXECUTIONS = 100;
export const MAX_SCHEDULE_EXECUTIONS = 100;

export interface AutomationSlice {
  rules: Rule[];
  schedules: Schedule[];
  executionHistory: AutomationExecution[];
  scheduleExecutions: ScheduleExecution[];

  setRules: (rules: Rule[]) => void;
  addRule: (rule: Rule) => void;
  updateRule: (ruleId: string, updates: Partial<Rule>) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;

  setSchedules: (schedules: Schedule[]) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (scheduleId: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (scheduleId: string) => void;

  addExecution: (execution: AutomationExecution) => void;
  addScheduleExecution: (execution: ScheduleExecution) => void;
}

export const createAutomationSlice: StateCreator<
  AutomationSlice,
  [],
  [],
  AutomationSlice
> = (set) => ({
  rules: [],
  schedules: [],
  executionHistory: [],
  scheduleExecutions: [],

  setRules: (rules) => set({ rules }),

  addRule: (rule) =>
    set((state) => ({
      rules: [rule, ...state.rules],
    })),

  updateRule: (ruleId, updates) =>
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId ? { ...r, ...updates, modifiedAt: Date.now() } : r
      ),
    })),

  deleteRule: (ruleId) =>
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== ruleId),
    })),

  toggleRule: (ruleId) =>
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId
          ? { ...r, enabled: !r.enabled, modifiedAt: Date.now() }
          : r
      ),
    })),

  setSchedules: (schedules) => set({ schedules }),

  addSchedule: (schedule) =>
    set((state) => ({
      schedules: [schedule, ...state.schedules],
    })),

  updateSchedule: (scheduleId, updates) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, ...updates, modifiedAt: Date.now() } : s
      ),
    })),

  deleteSchedule: (scheduleId) =>
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== scheduleId),
    })),

  addExecution: (execution) =>
    set((state) => ({
      executionHistory: [execution, ...state.executionHistory].slice(
        0,
        MAX_AUTOMATION_EXECUTIONS
      ),
    })),

  addScheduleExecution: (execution) =>
    set((state) => ({
      scheduleExecutions: [execution, ...state.scheduleExecutions].slice(
        0,
        MAX_SCHEDULE_EXECUTIONS
      ),
    })),
});

