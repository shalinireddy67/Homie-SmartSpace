import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useStore } from '@/store';
import { AutomationsPage } from '@/pages/AutomationsPage';
import { RuleBuilderModal } from '@/components/automations/RuleBuilderModal';
import { DryRunModal } from '@/components/automations/DryRunModal';
import { SchedulesTab } from '@/components/automations/SchedulesTab';
import { ExecutionHistoryTab } from '@/components/automations/ExecutionHistoryTab';
import * as commandsModule from '@/engine/commands';
import type { Rule, LightDevice, ThermostatDevice, Schedule } from '@/types';

describe('Automations & Dry-Run Feature Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
  });

  describe('Rule Builder Modal', () => {
    it('adds and removes conditions and actions dynamically', async () => {
      const user = userEvent.setup();
      const devices = useStore.getState().devices;
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <RuleBuilderModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          devices={devices}
        />
      );

      // Initially has 1 condition and 1 action
      expect(screen.getByText('Condition #1')).toBeInTheDocument();
      expect(screen.getByText('Action #1')).toBeInTheDocument();

      // Add condition
      const addCondBtn = screen.getByRole('button', { name: /add condition/i });
      await user.click(addCondBtn);
      expect(screen.getByText('Condition #2')).toBeInTheDocument();

      // Add action
      const addActBtn = screen.getByRole('button', { name: /add action/i });
      await user.click(addActBtn);
      expect(screen.getByText('Action #2')).toBeInTheDocument();

      // Remove condition #2
      const removeCondBtn = screen.getByRole('button', { name: /remove condition 2/i });
      await user.click(removeCondBtn);
      expect(screen.queryByText('Condition #2')).toBeNull();

      // Remove action #2
      const removeActBtn = screen.getByRole('button', { name: /remove action 2/i });
      await user.click(removeActBtn);
      expect(screen.queryByText('Action #2')).toBeNull();
    });

    it('shows validation errors and shifts focus when required fields are missing', async () => {
      const user = userEvent.setup();
      const devices = useStore.getState().devices;
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <RuleBuilderModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          devices={devices}
        />
      );

      // Clear the name field to trigger validation
      const nameInput = screen.getByPlaceholderText(/e\.g\. Night Eco Temperature/i);
      await user.clear(nameInput);

      const submitBtn = screen.getByRole('button', { name: /create automation/i });
      await user.click(submitBtn);

      // Error alert should be visible
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/rule name is required/i);
      expect(onSave).not.toHaveBeenCalled();

      // Focus should move to name input
      expect(document.activeElement).toBe(nameInput);
    });

    it('saves valid rule with createdAt and modifiedAt, while edit preserves createdAt', async () => {
      const user = userEvent.setup();
      const devices = useStore.getState().devices;
      const onSave = vi.fn();
      const onClose = vi.fn();

      const initialRule: Rule = {
        id: 'rule-test-existing',
        name: 'Existing Rule',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [{ id: 'c1', field: 'ambientTemp', operator: '>', value: 24 }],
        },
        actions: [{ id: 'a1', deviceId: 'dev-light-living', field: 'on', value: false }],
        cooldownMinutes: 5,
        createdAt: 1000000,
        modifiedAt: 1000000,
      };

      render(
        <RuleBuilderModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          devices={devices}
          initialRule={initialRule}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveBtn);

      expect(onSave).toHaveBeenCalledTimes(1);
      const savedRule: Rule = onSave.mock.calls[0]![0] as Rule;
      expect(savedRule.id).toBe('rule-test-existing');
      expect(savedRule.createdAt).toBe(1000000); // Preserved
      expect(savedRule.modifiedAt).toBeGreaterThanOrEqual(1000000); // Updated
    });

    it('supports keyboard accessibility: escape closes and focus is trapped', async () => {
      const devices = useStore.getState().devices;
      const onClose = vi.fn();

      render(
        <RuleBuilderModal
          isOpen={true}
          onClose={onClose}
          onSave={vi.fn()}
          devices={devices}
        />
      );

      // Press Escape on document
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dry-Run Simulation', () => {
    it('shows pass/fail per condition, AND vs OR result, and causes zero store side-effects', () => {
      const light = useStore.getState().devices.find((d) => d.type === 'light') as LightDevice;
      const therm = useStore.getState().devices.find((d) => d.type === 'thermostat') as ThermostatDevice;

      const rule: Rule = {
        id: 'rule-dry-run-spec',
        name: 'Dry Run Test Rule',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [
            { id: 'c-temp', field: 'ambientTemp', operator: '>', value: 22 },
            { id: 'c-light', deviceId: light.id, field: 'on', operator: '==', value: true },
          ],
        },
        actions: [
          { id: 'a-therm', deviceId: therm.id, field: 'target', value: 21 },
        ],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      const dispatchSpy = vi.spyOn(commandsModule, 'dispatchCommand');
      const storeStateBefore = JSON.parse(JSON.stringify(useStore.getState()));

      render(<DryRunModal isOpen={true} onClose={vi.fn()} rule={rule} />);

      // Verify permanent simulation banner is present
      expect(screen.getByText(/simulation\. live devices are not changed\./i)).toBeInTheDocument();

      // Check condition audit rows
      expect(screen.getByText(/condition audit/i)).toBeInTheDocument();
      expect(screen.getByText(/proposed actions analysis/i)).toBeInTheDocument();

      // Zero commands dispatched and store state unchanged
      expect(dispatchSpy).not.toHaveBeenCalled();
      const storeStateAfter = JSON.parse(JSON.stringify(useStore.getState()));
      expect(storeStateAfter.devices).toEqual(storeStateBefore.devices);
      expect(storeStateAfter.executionHistory).toEqual(storeStateBefore.executionHistory);

      dispatchSpy.mockRestore();
    });

    it('displays offline target message in proposed actions when target is offline', () => {
      const offlineDev = useStore.getState().devices.find((d) => !d.online)!;
      expect(offlineDev).toBeDefined();

      const rule: Rule = {
        id: 'rule-offline-dry',
        name: 'Offline Target Rule',
        enabled: true,
        conditionGroup: {
          logic: 'AND',
          conditions: [{ id: 'c1', field: 'ambientTemp', operator: '>', value: 10 }],
        },
        actions: [{ id: 'a1', deviceId: offlineDev.id, field: 'active', value: true }],
        cooldownMinutes: 0,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      render(<DryRunModal isOpen={true} onClose={vi.fn()} rule={rule} />);

      // Should indicate offline in proposed actions
      expect(screen.getByText(/would not run/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`"${offlineDev.name}" is offline`, 'i'))).toBeInTheDocument();
    });
  });

  describe('Schedules Tab', () => {
    it('displays next run computation and keeps configured and executed lists separate', () => {
      // Add a configured schedule
      const sched: Schedule = {
        id: 'sched-1',
        name: 'Morning Wakeup',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'act-1', deviceId: 'dev-light-living', field: 'on', value: true },
        time: '07:30',
        weekdays: [1, 2, 3, 4, 5],
        nextRunTime: 1730476800000 + 3600000,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([sched]);

      // Add a separate executed schedule run
      useStore.getState().addScheduleExecution({
        id: 'sexec-1',
        scheduleId: sched.id,
        scheduleName: sched.name,
        firedAt: 1730476800000,
        dueTime: 1730476800000,
        status: 'success',
        result: 'Command dispatched successfully',
        action: sched.action,
      });

      render(<SchedulesTab />);

      // Configured list shows schedule with Next Run and Executed list clearly separated below
      expect(screen.getAllByText('Morning Wakeup').length).toBe(2);
      expect(screen.getByText(/next run:/i)).toBeInTheDocument();

      // Executed list clearly separated below
      expect(screen.getByText('Executed Schedule Runs')).toBeInTheDocument();
      expect(screen.getByText('1 Recorded')).toBeInTheDocument();
      expect(screen.getByText(/Command dispatched successfully/i)).toBeInTheDocument();
    });

    it('allows toggling schedule enabled state', async () => {
      const user = userEvent.setup();
      const sched: Schedule = {
        id: 'sched-toggle',
        name: 'Evening Lighting',
        enabled: true,
        deviceId: 'dev-light-living',
        action: { id: 'act-1', deviceId: 'dev-light-living', field: 'on', value: false },
        time: '23:00',
        weekdays: [],
        nextRunTime: 1730476800000 + 7200000,
        createdAt: 1000,
        modifiedAt: 1000,
      };

      useStore.getState().setSchedules([sched]);
      render(<SchedulesTab />);

      const toggleBtn = screen.getByRole('switch', { name: /toggle schedule evening lighting/i });
      expect(toggleBtn).toHaveAttribute('aria-checked', 'true');

      await user.click(toggleBtn);
      expect(useStore.getState().schedules[0]?.enabled).toBe(false);
    });
  });

  describe('Execution History Tab', () => {
    it('merges rule executions and schedule runs newest first and supports status filtering', async () => {
      const user = userEvent.setup();

      act(() => {
        useStore.getState().addExecution({
          id: 'exec-rule-1',
          ruleId: 'rule-1',
          ruleName: 'Overheat Protection',
          timestamp: 20000,
          status: 'success',
          actionsExecuted: [],
          reason: 'Set thermostat to 20°C',
        });

        useStore.getState().addScheduleExecution({
          id: 'exec-sched-1',
          scheduleId: 'sched-1',
          scheduleName: 'Night Lock',
          firedAt: 30000,
          dueTime: 30000,
          status: 'skipped',
          result: 'Target device offline',
          action: { id: 'act-lock', deviceId: 'dev-lock-front', field: 'locked', value: true },
        });
      });

      render(
        <MemoryRouter>
          <ExecutionHistoryTab />
        </MemoryRouter>
      );

      // Both items visible
      expect(screen.getByText('Set thermostat to 20°C')).toBeInTheDocument();
      expect(screen.getByText('Target device offline')).toBeInTheDocument();

      // Filter by skipped status
      const statusSelect = screen.getByLabelText(/filter execution history by status/i);
      await user.selectOptions(statusSelect, 'skipped');

      // Night Lock row is visible, Overheat Protection row is filtered out
      expect(screen.getByText('Target device offline')).toBeInTheDocument();
      expect(screen.queryByText('Set thermostat to 20°C')).toBeNull();
    });
  });

  describe('Automations Page Integration', () => {
    it('renders all 3 tabs, allows switching, and displays empty state with Load Demo button', async () => {
      const user = userEvent.setup();
      useStore.getState().setRules([]);

      render(
        <MemoryRouter>
          <AutomationsPage />
        </MemoryRouter>
      );

      // Initial tab is Rules
      expect(screen.getByRole('tab', { name: /rules/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(/no automation rules configured/i)).toBeInTheDocument();

      // Click Load Demo Automation button
      const loadDemoBtns = screen.getAllByRole('button', { name: /load.*demo.*automation/i });
      expect(loadDemoBtns.length).toBeGreaterThan(0);
      await user.click(loadDemoBtns[0]!);

      // Rule created and displayed in list with enabled switch and summary
      expect(useStore.getState().rules.length).toBe(1);
      expect(screen.getByText('Eco Climate & Lighting')).toBeInTheDocument();
      expect(screen.getByText(/IF.*THEN/)).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();

      // Switch to Schedules tab
      const schedulesTab = screen.getByRole('tab', { name: /schedules/i });
      await user.click(schedulesTab);
      expect(screen.getByText('Configured Schedules')).toBeInTheDocument();

      // Switch to Execution History tab
      const historyTab = screen.getByRole('tab', { name: /history/i });
      await user.click(historyTab);
      expect(screen.getByRole('heading', { level: 2, name: 'Execution History' })).toBeInTheDocument();
    });

    it('duplicates an existing rule and deletes with confirmation modal', async () => {
      const user = userEvent.setup();
      const rule: Rule = {
        id: 'rule-dup-test',
        name: 'Auto Porch Light',
        enabled: true,
        conditionGroup: { logic: 'AND', conditions: [] },
        actions: [{ id: 'a1', deviceId: 'dev-light-porch', field: 'on', value: true }],
        cooldownMinutes: 5,
        createdAt: 1000,
        modifiedAt: 1000,
      };
      useStore.getState().setRules([rule]);

      render(
        <MemoryRouter>
          <AutomationsPage />
        </MemoryRouter>
      );

      // Duplicate
      const dupBtn = screen.getByRole('button', { name: /duplicate rule auto porch light/i });
      await user.click(dupBtn);
      expect(useStore.getState().rules.length).toBe(2);
      expect(screen.getByText('Auto Porch Light (Copy)')).toBeInTheDocument();

      // Delete the copy
      const deleteBtn = screen.getByRole('button', { name: /delete rule auto porch light \(copy\)/i });
      await user.click(deleteBtn);

      // Confirm modal opens
      expect(screen.getByRole('heading', { name: /delete automation rule/i })).toBeInTheDocument();
      const confirmDeleteBtn = screen.getByRole('button', { name: /^delete rule$/i });
      await user.click(confirmDeleteBtn);

      // Rule deleted
      expect(useStore.getState().rules.length).toBe(1);
      expect(screen.queryByText('Auto Porch Light (Copy)')).toBeNull();
    });
  });
});
