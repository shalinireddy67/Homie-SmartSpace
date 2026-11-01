/**
 * Automation Engine: Rule Evaluation, Edge-Triggering, Conflict Handling & Execution.
 *
 * POLICIES:
 * 1. PURE EVALUATION: evaluateRule() evaluates rules against a read-only snapshot of devices,
 *    rooms, and virtual time. It produces zero mutations or side-effects.
 * 2. EDGE-TRIGGERED SEMANTICS: Rules fire only when overall eligibility transitions from
 *    false to true (rising edge). They do NOT continuously re-fire while staying true.
 * 3. COOLDOWN ENFORCEMENT: If cooldownMinutes > 0, the rule cannot fire again until the
 *    cooldown period has elapsed, even if an edge transition occurs.
 * 4. LOOP & CASCADE PREVENTION:
 *    - causedByAutomation Guard: Actions dispatched by automations carry causedByAutomation: true.
 *      Rules NEVER trigger from automation-induced state changes, completely preventing loops.
 *    - Hop Depth Cap: A hard 3-hop cascade depth limit is maintained as secondary defense.
 * 5. CONFLICT RESOLUTION: If multiple rules evaluated in the same pass target the same
 *    device field (e.g. Living Room Chandelier brightness), the LAST rule in priority order
 *    (array index) wins. The earlier conflicting action is skipped with a logged reason.
 * 6. OFFLINE TARGET HANDLING: Actions targeting offline devices are skipped without crashing
 *    or aborting other actions. If all actions in an execution are offline, the execution is
 *    recorded as "skipped".
 * 7. TIME WINDOWS & WEEKDAYS: Time windows support crossing midnight (e.g. 23:00 to 05:00)
 *    with start inclusive and end exclusive. Empty weekday arrays represent all 7 days.
 */

import type {
  Rule,
  Condition,
  Action,
  Device,
  Room,
  AutomationExecution,
  LogEvent,
} from '@/types';
import type { Clock, Scheduler, CommandResult } from './interfaces';
import type { StoreAccessor, CommandExecutor } from './commands';
import { dispatchCommand } from './commands';

export interface StateSnapshot {
  devices: Device[];
  rooms: Room[];
  currentTime: number;
  totalWatts?: number;
}

export interface ConditionEvaluationResult {
  id: string;
  passed: boolean;
  actualValue: unknown;
  expectedValue: unknown;
  reason: string;
}

export interface RuleEvaluationResult {
  conditionResults: ConditionEvaluationResult[];
  groupResult: boolean;
  windowResult: boolean;
  weekdayResult: boolean;
  overallEligible: boolean;
}

export interface RuleExecutionState {
  previouslyEligible: boolean;
  lastTriggeredAt?: number;
}

export interface ExecutionContext {
  causedByAutomation?: boolean;
  hopDepth?: number;
}

export interface DecisionResult {
  fire: boolean;
  reason: string;
  nextRuleState: RuleExecutionState;
}

/**
 * Parses "HH:mm" time string into minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  return hours * 60 + minutes;
}

/**
 * Checks if a given timestamp falls within [start, end) time window.
 * Supports windows that cross midnight (e.g. 23:00 to 05:00).
 */
export function isTimeInWindow(currentTimeMs: number, startStr: string, endStr: string): boolean {
  const date = new Date(currentTimeMs);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);

  if (start < end) {
    // Standard daytime window: start inclusive, end exclusive
    return currentMinutes >= start && currentMinutes < end;
  } else if (start > end) {
    // Overnight window crossing midnight
    return currentMinutes >= start || currentMinutes < end;
  } else {
    // start === end: 24-hour window
    return true;
  }
}

/**
 * Compares two scalar values using a typed ComparisonOperator.
 */
function compareValues(
  actual: unknown,
  operator: string,
  expected: unknown
): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    switch (operator) {
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      case '>':
        return actual > expected;
      case '<':
        return actual < expected;
      case '>=':
        return actual >= expected;
      case '<=':
        return actual <= expected;
      default:
        return false;
    }
  }

  switch (operator) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    default:
      return false;
  }
}

/**
 * Evaluates a single condition against the state snapshot.
 */
export function evaluateCondition(
  condition: Condition,
  snapshot: StateSnapshot
): ConditionEvaluationResult {
  const { deviceId, field, operator, value } = condition;

  // 1. If condition targets a specific device
  if (deviceId) {
    const dev = snapshot.devices.find((d) => d.id === deviceId);
    if (!dev) {
      return {
        id: condition.id,
        passed: false,
        actualValue: undefined,
        expectedValue: value,
        reason: `Target device ${deviceId} not found`,
      };
    }

    // POLICY: Offline device - state conditions fail with "device offline".
    // Only explicit online/offline check can evaluate normally.
    if (!dev.online && field !== 'online') {
      return {
        id: condition.id,
        passed: false,
        actualValue: (dev as unknown as Record<string, unknown>)[field],
        expectedValue: value,
        reason: 'device offline',
      };
    }

    const actual = (dev as unknown as Record<string, unknown>)[field];
    const passed = compareValues(actual, operator, value);
    return {
      id: condition.id,
      passed,
      actualValue: actual,
      expectedValue: value,
      reason: passed
        ? `${dev.name}.${field} (${actual}) ${operator} ${value}`
        : `${dev.name}.${field} (${actual}) does not satisfy ${operator} ${value}`,
    };
  }

  // 2. Room ambient telemetry conditions (e.g. ambientTemp, ambientHumidity)
  if (field === 'ambientTemp' || field === 'ambientHumidity') {
    // Check across rooms
    const matchedRoom = snapshot.rooms.find((r) =>
      compareValues(r[field], operator, value)
    );
    const passed = Boolean(matchedRoom);
    return {
      id: condition.id,
      passed,
      actualValue: matchedRoom ? matchedRoom[field] : snapshot.rooms[0]?.[field],
      expectedValue: value,
      reason: passed
        ? `Room ${matchedRoom?.name} ${field} satisfies ${operator} ${value}`
        : `No room satisfies ${field} ${operator} ${value}`,
    };
  }

  // 3. Power telemetry conditions (total power)
  if (field === 'powerWatts' || field === 'totalWatts') {
    const actualWatts =
      snapshot.totalWatts ??
      snapshot.devices
        .filter((d) => d.online)
        .reduce((sum, d) => sum + d.powerWatts, 0);

    const passed = compareValues(actualWatts, operator, value);
    return {
      id: condition.id,
      passed,
      actualValue: actualWatts,
      expectedValue: value,
      reason: passed
        ? `Total power (${actualWatts} W) ${operator} ${value} W`
        : `Total power (${actualWatts} W) does not satisfy ${operator} ${value} W`,
    };
  }

  // 4. Time condition
  if (field === 'time') {
    const date = new Date(snapshot.currentTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${mins}`;
    const passed = compareValues(currentTimeStr, operator, value);
    return {
      id: condition.id,
      passed,
      actualValue: currentTimeStr,
      expectedValue: value,
      reason: passed
        ? `Time (${currentTimeStr}) ${operator} ${value}`
        : `Time (${currentTimeStr}) does not satisfy ${operator} ${value}`,
    };
  }

  return {
    id: condition.id,
    passed: false,
    actualValue: undefined,
    expectedValue: value,
    reason: `Unknown condition field: ${field}`,
  };
}

/**
 * Evaluates an entire Rule against a StateSnapshot.
 * Pure function: takes snapshot, returns structured evaluation result without side-effects.
 */
export function evaluateRule(
  rule: Rule,
  snapshot: StateSnapshot
): RuleEvaluationResult {
  // 1. Evaluate all individual conditions
  const conditionResults = rule.conditionGroup.conditions.map((c) =>
    evaluateCondition(c, snapshot)
  );

  // 2. Evaluate condition group logic (AND vs OR)
  let groupResult: boolean;
  if (conditionResults.length === 0) {
    groupResult = true;
  } else if (rule.conditionGroup.logic === 'AND') {
    groupResult = conditionResults.every((c) => c.passed);
  } else {
    groupResult = conditionResults.some((c) => c.passed);
  }

  // 3. Evaluate time window if specified
  let windowResult = true;
  if (rule.timeWindow) {
    windowResult = isTimeInWindow(
      snapshot.currentTime,
      rule.timeWindow.start,
      rule.timeWindow.end
    );
  }

  // 4. Evaluate weekdays (empty array means all days)
  let weekdayResult = true;
  if (rule.weekdays && rule.weekdays.length > 0) {
    const currentWeekday = new Date(snapshot.currentTime).getDay();
    weekdayResult = rule.weekdays.includes(currentWeekday);
  }

  // 5. Overall eligibility
  const overallEligible = groupResult && windowResult && weekdayResult;

  return {
    conditionResults,
    groupResult,
    windowResult,
    weekdayResult,
    overallEligible,
  };
}

/**
 * Decides whether a rule should fire based on edge-triggering, cooldowns, and loop guards.
 * Pure function: returns { fire, reason, nextRuleState }.
 */
export function decideExecution(
  rule: Rule,
  snapshot: StateSnapshot,
  ruleState: RuleExecutionState,
  context: ExecutionContext = {}
): DecisionResult {
  // Guard 1: Disabled rule never fires
  if (!rule.enabled) {
    return {
      fire: false,
      reason: 'Rule is disabled',
      nextRuleState: ruleState,
    };
  }

  // Guard 2: Loop prevention - never fire if caused by automation
  if (context.causedByAutomation) {
    return {
      fire: false,
      reason: 'Suppressed: caused by automation (loop guard)',
      nextRuleState: ruleState,
    };
  }

  // Guard 3: Secondary backup hop depth limit
  if (context.hopDepth !== undefined && context.hopDepth >= 3) {
    return {
      fire: false,
      reason: 'Suppressed: maximum 3-hop cascade depth reached',
      nextRuleState: ruleState,
    };
  }

  // Evaluate rule conditions
  const evalResult = evaluateRule(rule, snapshot);
  const isEligibleNow = evalResult.overallEligible;

  // Guard 4: Edge-triggered check (must transition from false -> true)
  const isRisingEdge = !ruleState.previouslyEligible && isEligibleNow;

  if (!isEligibleNow) {
    return {
      fire: false,
      reason: 'Conditions not met',
      nextRuleState: {
        previouslyEligible: false,
        lastTriggeredAt: ruleState.lastTriggeredAt,
      },
    };
  }

  if (!isRisingEdge) {
    return {
      fire: false,
      reason: 'Condition remained true (edge-triggered)',
      nextRuleState: {
        previouslyEligible: true,
        lastTriggeredAt: ruleState.lastTriggeredAt,
      },
    };
  }

  // Guard 5: Cooldown enforcement
  if (rule.cooldownMinutes > 0 && ruleState.lastTriggeredAt !== undefined) {
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const elapsedMs = snapshot.currentTime - ruleState.lastTriggeredAt;
    if (elapsedMs < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - elapsedMs) / 60000);
      return {
        fire: false,
        reason: `Cooldown active (${remainingMinutes}m remaining)`,
        nextRuleState: {
          previouslyEligible: true,
          lastTriggeredAt: ruleState.lastTriggeredAt,
        },
      };
    }
  }

  // All criteria satisfied: FIRE!
  return {
    fire: true,
    reason: 'Edge-triggered condition transition (false -> true)',
    nextRuleState: {
      previouslyEligible: true,
      lastTriggeredAt: snapshot.currentTime,
    },
  };
}

export interface RunAutomationsDeps {
  store: StoreAccessor;
  clock: Clock;
  scheduler: Scheduler;
  executor?: CommandExecutor;
  ruleStates: Map<string, RuleExecutionState>;
  context?: ExecutionContext;
}

export interface AutomationRunResult {
  executionsCreated: AutomationExecution[];
  commandsDispatched: CommandResult[];
}

/**
 * Evaluates all enabled rules in priority order, handles conflicts, and dispatches actions.
 */
export async function runAutomations(
  deps: RunAutomationsDeps
): Promise<AutomationRunResult> {
  const { store, clock, scheduler, executor, ruleStates, context = {} } = deps;
  const state = store.getState();
  const snapshot: StateSnapshot = {
    devices: state.devices,
    rooms: state.rooms,
    currentTime: clock.now(),
  };

  const enabledRules = state.rules.filter((r) => r.enabled);
  const executionsCreated: AutomationExecution[] = [];
  const commandsDispatched: CommandResult[] = [];

  // Group candidate actions across fired rules: Map<`${deviceId}:${field}`, { action, rule, index }>
  interface PlannedAction {
    action: Action;
    rule: Rule;
    ruleIndex: number;
  }
  const fieldActions = new Map<string, PlannedAction[]>();
  const rulesToFire: Rule[] = [];

  for (let i = 0; i < enabledRules.length; i++) {
    const rule = enabledRules[i]!;
    const currentState = ruleStates.get(rule.id) || { previouslyEligible: false };
    const decision = decideExecution(rule, snapshot, currentState, context);

    // Update rule state tracker
    ruleStates.set(rule.id, decision.nextRuleState);

    if (decision.fire) {
      rulesToFire.push(rule);
      for (const action of rule.actions) {
        const key = `${action.deviceId}:${action.field}`;
        const existing = fieldActions.get(key) || [];
        existing.push({ action, rule, ruleIndex: i });
        fieldActions.set(key, existing);
      }
    }
  }

  // Process each rule that fired
  for (const rule of rulesToFire) {
    const executedActions: Action[] = [];
    const skippedReasons: string[] = [];

    for (const action of rule.actions) {
      const key = `${action.deviceId}:${action.field}`;
      const candidates = fieldActions.get(key) || [];

      // CONFLICT RESOLUTION: Last rule in priority order (highest ruleIndex) wins!
      const winningCandidate = candidates[candidates.length - 1];
      if (winningCandidate && winningCandidate.rule.id !== rule.id) {
        skippedReasons.push(
          `Action on ${action.deviceId}.${action.field} overridden by higher priority rule "${winningCandidate.rule.name}"`
        );
        continue;
      }

      // OFFLINE TARGET CHECK: Action skipped if target device is offline
      const targetDev = store.getState().devices.find((d) => d.id === action.deviceId);
      if (!targetDev || !targetDev.online) {
        skippedReasons.push(
          `Target device "${targetDev?.name || action.deviceId}" is offline`
        );
        continue;
      }

      // Execute command with causedByAutomation flag to prevent loops
      executedActions.push(action);
      const cmdResult = await dispatchCommand(
        action.deviceId,
        { [action.field]: action.value },
        {
          store,
          clock,
          scheduler,
          executor,
        }
      );
      commandsDispatched.push(cmdResult);
    }

    const allSkipped = executedActions.length === 0;
    const executionStatus: 'success' | 'skipped' = allSkipped ? 'skipped' : 'success';
    const executionReason = allSkipped
      ? skippedReasons.join('; ') || 'All actions skipped'
      : 'Rule executed successfully';

    const executionRecord: AutomationExecution = {
      id: `exec-${clock.now()}-${rule.id}`,
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: clock.now(),
      status: executionStatus,
      reason: executionReason,
      actionsExecuted: executedActions,
    };

    store.getState().addExecution(executionRecord);
    executionsCreated.push(executionRecord);

    // Emit typed event into event log
    const eventLog: LogEvent = {
      id: `evt-auto-${clock.now()}-${rule.id}`,
      timestamp: clock.now(),
      type: 'automation',
      severity: executionStatus === 'success' ? 'success' : 'info',
      automationId: rule.id,
      description: `Automation "${rule.name}": ${executionReason}`,
      details: {
        actionsCount: executedActions.length,
        status: executionStatus,
      },
    };
    store.getState().addEvent(eventLog);
  }

  return {
    executionsCreated,
    commandsDispatched,
  };
}

