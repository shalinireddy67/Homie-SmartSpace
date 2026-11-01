/**
 * Dry-Run Simulator for Automation Rules.
 * Pure TypeScript. Zero React imports.
 *
 * Guarantees:
 * - Strictly isolated and read-only.
 * - Uses evaluateRule (identical evaluation logic to live engine).
 * - Never mutates store state, schedules commands, creates executions,
 *   or generates notifications/events.
 */

import type { Rule, Action, Device } from '@/types';
import type { StateSnapshot, ConditionEvaluationResult } from './automation';
import { evaluateRule } from './automation';

export interface ProposedActionAnalysis {
  action: Action;
  targetDevice?: Device;
  willRun: boolean;
  reason: string;
}

export interface DryRunReport {
  simulation: true;
  inputs: StateSnapshot;
  conditionResults: ConditionEvaluationResult[];
  groupResult: boolean;
  windowResult: boolean;
  weekdayResult: boolean;
  overall: boolean;
  proposedActions: ProposedActionAnalysis[];
}

/**
 * Runs a dry-run evaluation of a Rule against a simulated StateSnapshot.
 * Returns a detailed step-by-step audit report without side-effects.
 */
export function dryRunRule(
  rule: Rule,
  simulatedSnapshot: StateSnapshot
): DryRunReport {
  // 1. Evaluate with the exact same pure evaluateRule engine function
  const evaluation = evaluateRule(rule, simulatedSnapshot);

  // 2. Analyze proposed actions without executing them
  const proposedActions: ProposedActionAnalysis[] = rule.actions.map((action) => {
    const targetDev = simulatedSnapshot.devices.find(
      (d) => d.id === action.deviceId
    );

    if (!evaluation.overallEligible) {
      return {
        action,
        targetDevice: targetDev,
        willRun: false,
        reason: 'Rule conditions not satisfied',
      };
    }

    if (!targetDev) {
      return {
        action,
        willRun: false,
        reason: `Target device "${action.deviceId}" not found in snapshot`,
      };
    }

    if (!targetDev.online) {
      return {
        action,
        targetDevice: targetDev,
        willRun: false,
        reason: `Target device "${targetDev.name}" is offline (${targetDev.offlineReason || 'Disconnected'})`,
      };
    }

    return {
      action,
      targetDevice: targetDev,
      willRun: true,
      reason: `Would update ${action.field} to ${action.value}`,
    };
  });

  return {
    simulation: true,
    inputs: simulatedSnapshot,
    conditionResults: evaluation.conditionResults,
    groupResult: evaluation.groupResult,
    windowResult: evaluation.windowResult,
    weekdayResult: evaluation.weekdayResult,
    overall: evaluation.overallEligible,
    proposedActions,
  };
}
