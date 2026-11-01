import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateRule,
  decideExecution,
  runAutomations,
  isTimeInWindow,
  type StateSnapshot,
  type RuleExecutionState,
} from '@/engine/automation';
import { useStore } from '@/store';
import type { Rule, LightDevice, ThermostatDevice, LockDevice } from '@/types';
import type { Clock, Scheduler } from '@/engine/interfaces';

class FakeClock implements Clock {
  currentTime = 1730476800000;
  now(): number {
    return this.currentTime;
  }
  advance(ms: number): void {
    this.currentTime += ms;
  }
}

class FakeScheduler implements Scheduler {
  async delay(_ms: number): Promise<void> {
    return Promise.resolve();
  }
  setInterval(_callback: () => void, _ms: number): number {
    return 1;
  }
  clearInterval(_handle: unknown): void {}
}

describe('Automation Engine (Rule Evaluator & Runner)', () => {
  let clock: FakeClock;
  let scheduler: FakeScheduler;
  let sampleSnapshot: StateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
    clock = new FakeClock();
    scheduler = new FakeScheduler();

    sampleSnapshot = {
      devices: useStore.getState().devices,
      rooms: useStore.getState().rooms,
      currentTime: clock.now(),
      totalWatts: 500,
    };
  });

  describe('Time Windows & Weekdays', () => {
    it('evaluates daytime window correctly (start inclusive, end exclusive)', () => {
      // 14:00 (14 * 60 = 840 mins)
      const testTime = new Date('2026-11-01T14:00:00').getTime();
      expect(isTimeInWindow(testTime, '14:00', '18:00')).toBe(true); // Inclusive start

      const earlyTime = new Date('2026-11-01T13:59:00').getTime();
      expect(isTimeInWindow(earlyTime, '14:00', '18:00')).toBe(false);

      const endTime = new Date('2026-11-01T18:00:00').getTime();
      expect(isTimeInWindow(endTime, '14:00', '18:00')).toBe(false); // Exclusive end
    });

    it('evaluates midnight-crossing window correctly (e.g. 23:00 to 05:00)', () => {
      const midnight = new Date('2026-11-01T00:30:00').getTime();
      expect(isTimeInWindow(midnight, '23:00', '05:00')).toBe(true);

      const lateNight = new Date('2026-11-01T23:15:00').getTime();
      expect(isTimeInWindow(lateNight, '23:00', '05:00')).toBe(true);

      const morning = new Date('2026-11-01T04:59:00').getTime();
      expect(isTimeInWindow(morning, '23:00', '05:00')).toBe(true);

      const afternoon = new Date('2026-11-01T14:00:00').getTime();
      expect(isTimeInWindow(afternoon, '23:00', '05:00')).toBe(false);
    });

    it('considers empty weekday list as every day', () => {
      const rule: Rule = {
        id: 'r-1',
        name: 'Everyday Rule',
        enabled: true,
        conditionGroup: { logic: 'AND', conditions: [] },
        actions: [],
        weekdays: [], // Empty list = all days
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const result = evaluateRule(rule, sampleSnapshot);
      expect(result.weekdayResult).toBe(true);
      expect(result.overallEligible).toBe(true);
    });
  });

  describe('evaluateRule Condition Kinds', () => {
    it('evaluates temperature above and below thresholds', () => {
      const therm = sampleSnapshot.devices.find((d): d is ThermostatDevice => d.type === 'thermostat' && d.online)!;

      const ruleAbove: Rule = {
        id: 'r-temp-above',
        name: 'Temp Above',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [
            {
              id: 'c-1',
              deviceId: therm.id,
              field: 'current',
              operator: '>',
              value: therm.current - 2,
            },
          ],
        },
        actions: [],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const resAbove = evaluateRule(ruleAbove, sampleSnapshot);
      expect(resAbove.overallEligible).toBe(true);
      expect(resAbove.conditionResults[0]?.passed).toBe(true);

      const ruleBelow: Rule = {
        ...ruleAbove,
        id: 'r-temp-below',
        conditionGroup: {
          logic: 'AND',
          conditions: [
            {
              id: 'c-2',
              deviceId: therm.id,
              field: 'current',
              operator: '<',
              value: therm.current - 5,
            },
          ],
        },
      };

      const resBelow = evaluateRule(ruleBelow, sampleSnapshot);
      expect(resBelow.overallEligible).toBe(false);
      expect(resBelow.conditionResults[0]?.passed).toBe(false);
    });

    it('evaluates device on/off and lock states', () => {
      const light = sampleSnapshot.devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;
      const lock = sampleSnapshot.devices.find((d): d is LockDevice => d.type === 'lock' && d.online)!;

      const rule: Rule = {
        id: 'r-states',
        name: 'Light & Lock State',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [
            {
              id: 'c-light',
              deviceId: light.id,
              field: 'on',
              operator: '==',
              value: light.on,
            },
            {
              id: 'c-lock',
              deviceId: lock.id,
              field: 'locked',
              operator: '==',
              value: lock.locked,
            },
          ],
        },
        actions: [],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const res = evaluateRule(rule, sampleSnapshot);
      expect(res.overallEligible).toBe(true);
    });

    it('offline device: state condition is false with reason "device offline", but online/offline condition passes', () => {
      const offlineDev = sampleSnapshot.devices.find((d) => !d.online)!;
      expect(offlineDev).toBeDefined();

      // State condition on offline device (e.g. active === true or brightness)
      const ruleStateCond: Rule = {
        id: 'r-offline-state',
        name: 'Offline State',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [
            {
              id: 'c-active',
              deviceId: offlineDev.id,
              field: 'active',
              operator: '==',
              value: false,
            },
          ],
        },
        actions: [],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const resState = evaluateRule(ruleStateCond, sampleSnapshot);
      expect(resState.overallEligible).toBe(false);
      expect(resState.conditionResults[0]?.passed).toBe(false);
      expect(resState.conditionResults[0]?.reason).toBe('device offline');

      // Explicit online/offline condition CAN pass
      const ruleExplicitOnline: Rule = {
        id: 'r-offline-explicit',
        name: 'Explicit Offline Check',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [
            {
              id: 'c-online',
              deviceId: offlineDev.id,
              field: 'online',
              operator: '==',
              value: false,
            },
          ],
        },
        actions: [],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const resExplicit = evaluateRule(ruleExplicitOnline, sampleSnapshot);
      expect(resExplicit.overallEligible).toBe(true);
      expect(resExplicit.conditionResults[0]?.passed).toBe(true);
    });

    it('evaluates total power draw threshold', () => {
      sampleSnapshot.totalWatts = 650;

      const rulePower: Rule = {
        id: 'r-power',
        name: 'High Power Alert',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [
            {
              id: 'c-pow',
              field: 'totalWatts',
              operator: '>=',
              value: 600,
            },
          ],
        },
        actions: [],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      expect(evaluateRule(rulePower, sampleSnapshot).overallEligible).toBe(true);

      sampleSnapshot.totalWatts = 400;
      expect(evaluateRule(rulePower, sampleSnapshot).overallEligible).toBe(false);
    });
  });

  describe('decideExecution Policies', () => {
    const dummyRule: Rule = {
      id: 'r-dummy',
      name: 'Dummy Rule',
      enabled: true,
      conditionGroup: { logic: 'AND', conditions: [] }, // always eligible
      actions: [],
      cooldownMinutes: 10,
      createdAt: 1000,
      modifiedAt: 1000,
    };

    it('fires on rising edge (previouslyEligible: false -> true)', () => {
      const state: RuleExecutionState = { previouslyEligible: false };
      const decision = decideExecution(dummyRule, sampleSnapshot, state);

      expect(decision.fire).toBe(true);
      expect(decision.nextRuleState.previouslyEligible).toBe(true);
      expect(decision.nextRuleState.lastTriggeredAt).toBe(sampleSnapshot.currentTime);
    });

    it('does NOT fire when conditions remain continuously true', () => {
      const state: RuleExecutionState = {
        previouslyEligible: true,
        lastTriggeredAt: sampleSnapshot.currentTime - 999999,
      };
      const decision = decideExecution(dummyRule, sampleSnapshot, state);

      expect(decision.fire).toBe(false);
      expect(decision.reason).toContain('remained true');
    });

    it('enforces cooldown even if rising edge occurs', () => {
      const state: RuleExecutionState = {
        previouslyEligible: false,
        lastTriggeredAt: sampleSnapshot.currentTime - 300000, // 5 minutes ago (cooldown is 10 min)
      };
      const decision = decideExecution(dummyRule, sampleSnapshot, state);

      expect(decision.fire).toBe(false);
      expect(decision.reason).toContain('Cooldown active');
    });

    it('never fires if rule is disabled', () => {
      const disabledRule: Rule = { ...dummyRule, enabled: false };
      const state: RuleExecutionState = { previouslyEligible: false };

      const decision = decideExecution(disabledRule, sampleSnapshot, state);
      expect(decision.fire).toBe(false);
      expect(decision.reason).toBe('Rule is disabled');
    });

    it('never fires if causedByAutomation is true (loop guard)', () => {
      const state: RuleExecutionState = { previouslyEligible: false };

      const decision = decideExecution(dummyRule, sampleSnapshot, state, {
        causedByAutomation: true,
      });
      expect(decision.fire).toBe(false);
      expect(decision.reason).toContain('caused by automation');
    });

    it('never fires if hop depth reaches 3-hop limit', () => {
      const state: RuleExecutionState = { previouslyEligible: false };

      const decision = decideExecution(dummyRule, sampleSnapshot, state, {
        hopDepth: 3,
      });
      expect(decision.fire).toBe(false);
      expect(decision.reason).toContain('3-hop cascade depth');
    });
  });

  describe('Conflict Resolution & Action Execution', () => {
    it('resolves conflicting actions on the same device field: last rule in array wins', async () => {
      const light = sampleSnapshot.devices.find((d): d is LightDevice => d.type === 'light' && d.online)!;

      const ruleA: Rule = {
        id: 'rule-A',
        name: 'Rule A (Set 40%)',
        enabled: true,
        conditionGroup: { logic: 'AND', conditions: [] },
        actions: [{ id: 'act-a', deviceId: light.id, field: 'brightness', value: 40 }],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const ruleB: Rule = {
        id: 'rule-B',
        name: 'Rule B (Set 85%)',
        enabled: true,
        conditionGroup: { logic: 'AND', conditions: [] },
        actions: [{ id: 'act-b', deviceId: light.id, field: 'brightness', value: 85 }],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setRules([ruleA, ruleB]);

      const ruleStates = new Map<string, RuleExecutionState>();
      const result = await runAutomations({
        store: useStore,
        clock,
        scheduler,
        ruleStates,
      });

      // Both rules fired, but Rule A's conflicting action was overridden by Rule B
      const updatedLight = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
      expect(updatedLight.brightness).toBe(85);

      const execA = result.executionsCreated.find((e) => e.ruleId === 'rule-A');
      expect(execA?.status).toBe('skipped');
      expect(execA?.reason).toContain('overridden by higher priority rule');

      const execB = result.executionsCreated.find((e) => e.ruleId === 'rule-B');
      expect(execB?.status).toBe('success');
    });

    it('skips actions targeting offline devices and marks execution as skipped', async () => {
      const offlineDev = sampleSnapshot.devices.find((d) => !d.online)!;

      const offlineRule: Rule = {
        id: 'rule-offline-target',
        name: 'Target Offline Device',
        enabled: true,
        conditionGroup: { logic: 'AND', conditions: [] },
        actions: [{ id: 'act-offline', deviceId: offlineDev.id, field: 'active', value: true }],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setRules([offlineRule]);

      const ruleStates = new Map<string, RuleExecutionState>();
      const result = await runAutomations({
        store: useStore,
        clock,
        scheduler,
        ruleStates,
      });

      expect(result.executionsCreated.length).toBe(1);
      expect(result.executionsCreated[0]?.status).toBe('skipped');
      expect(result.executionsCreated[0]?.reason).toContain('offline');
    });
  });
});
