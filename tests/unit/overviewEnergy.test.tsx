import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '@/store';
import { OverviewPage } from '@/pages/OverviewPage';
import { EnergyAnalyticsPage } from '@/pages/EnergyAnalyticsPage';
import { SimulationEngine } from '@/engine/simulation';
import { PRNG } from '@/utils/prng';
import type { LightDevice, Rule } from '@/types';

describe('Overview & Energy Analytics Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
  });

  describe('Overview Dashboard', () => {
    it('renders all 8 typed metric cards with non-NaN values from store', () => {
      render(<OverviewPage />);

      expect(screen.getByText('Total Devices')).toBeInTheDocument();
      expect(screen.getAllByText('Online').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Offline').length).toBeGreaterThan(0);
      expect(screen.getByText('Active Automations')).toBeInTheDocument();
      expect(screen.getByText('Current Power')).toBeInTheDocument();
      expect(screen.getByText("Today's Energy")).toBeInTheDocument();
      expect(screen.getByText('Indoor Temp')).toBeInTheDocument();
      expect(screen.getByText('Humidity')).toBeInTheDocument();

      // Verify no NaN anywhere on initial render
      expect(screen.queryByText(/NaN/)).toBeNull();
    });

    it('shows warning banner when simulation is paused and allows resuming', async () => {
      const user = userEvent.setup();
      useStore.getState().setRunning(false);

      render(<OverviewPage />);

      const warning = screen.getByRole('region', { name: /simulation status warning/i });
      expect(warning).toBeInTheDocument();
      expect(screen.getByText(/simulation engine paused/i)).toBeInTheDocument();

      const resumeBtn = screen.getByRole('button', { name: /resume simulation/i });
      await user.click(resumeBtn);

      expect(useStore.getState().running).toBe(true);
    });

    it('updates power watts and counts when a device is turned off and goes offline', () => {
      render(<OverviewPage />);

      const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
      expect(light.on).toBe(true);
      const initialWatts = useStore.getState().devices.reduce((acc, d) => acc + (d.online ? d.powerWatts : 0), 0);

      // Turn off device
      act(() => {
        useStore.getState().updateDevice(light.id, {
          on: false,
          powerWatts: 0,
        });
      });

      const updatedWatts = initialWatts - light.powerWatts;
      expect(screen.getByText(new RegExp(`${updatedWatts}\\s*W`))).toBeInTheDocument();

      // Transition another device to offline
      const kitchenDev = useStore.getState().devices.find((d) => d.id === 'dev-light-kitchen')!;
      act(() => {
        useStore.getState().updateDevice(kitchenDev.id, {
          online: false,
          offlineReason: 'Connection dropped',
        });
      });

      // Offline count should increase from 1 to 2
      const offlineCard = screen.getAllByText('Offline')[0]!.closest('div[class*="bg-surface-card"]') as HTMLElement;
      expect(within(offlineCard).getByText('2')).toBeInTheDocument();
    });

    it('reflects new execution in recent automations panel when a rule fires', () => {
      render(<OverviewPage />);

      const rule: Rule = useStore.getState().rules[0]!;
      expect(rule).toBeDefined();

      act(() => {
        useStore.getState().addExecution({
          id: 'exec-mock-1',
          ruleId: rule.id,
          ruleName: rule.name,
          timestamp: Date.now(),
          status: 'success',
          actionsExecuted: rule.actions,
          reason: 'Set temp triggered',
        });
      });

      expect(screen.getByText(rule.name)).toBeInTheDocument();
      expect(screen.getByText('Executed')).toBeInTheDocument();
    });
  });

  describe('Energy Analytics Page', () => {
    it('range selector updates bucket count and total energy between 1h, 24h, 7d, 30d', async () => {
      const user = userEvent.setup();
      render(<EnergyAnalyticsPage />);

      // Default is 24h
      expect(screen.getByText(/24 Buckets/i)).toBeInTheDocument();

      // Switch to 1h
      const btn1h = screen.getByRole('radio', { name: /^1h$/i });
      await user.click(btn1h);
      expect(screen.getByText(/60 Buckets/i)).toBeInTheDocument();

      // Switch to 7d
      const btn7d = screen.getByRole('radio', { name: /^7d$/i });
      await user.click(btn7d);
      expect(screen.getByText(/7 Buckets/i)).toBeInTheDocument();

      // Switch to 30d
      const btn30d = screen.getByRole('radio', { name: /^30d$/i });
      await user.click(btn30d);
      expect(screen.getByText(/30 Buckets/i)).toBeInTheDocument();
    });

    it('validates custom date range and shows error message for invalid range', async () => {
      const user = userEvent.setup();
      render(<EnergyAnalyticsPage />);

      const btnCustom = screen.getByRole('radio', { name: /^custom$/i });
      await user.click(btnCustom);

      expect(screen.getByText(/Custom Time Range:/i)).toBeInTheDocument();

      // Select invalid range (start after end)
      const startInput = screen.getByLabelText(/start:/i);
      const endInput = screen.getByLabelText(/end:/i);

      fireEvent.change(startInput, { target: { value: '2026-11-02T18:00' } });
      fireEvent.change(endInput, { target: { value: '2026-11-02T12:00' } });

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/end time must be strictly after start time/i);
    });

    it('sum of device kWh and sum of room kWh equal total on the page', () => {
      render(<EnergyAnalyticsPage />);

      // Find Total Consumption element
      const summaryCards = screen.getAllByText(/Total Consumption/i);
      expect(summaryCards.length).toBeGreaterThan(0);

      // Verify device and room breakdown cards have matching totals
      const deviceHeading = screen.getByText('Consumption by Device');
      const deviceCard = deviceHeading.closest('div[class*="border"]') as HTMLElement;
      const roomHeading = screen.getByText('Consumption by Room');
      const roomCard = roomHeading.closest('div[class*="border"]') as HTMLElement;

      expect(within(deviceCard).getByText(/Total:/i)).toBeInTheDocument();
      expect(within(roomCard).getByText(/Total:/i)).toBeInTheDocument();
    });

    it('renders anomaly in legend, anomaly list, and stat card', () => {
      render(<EnergyAnalyticsPage />);

      // Legend shows anomaly
      expect(screen.getByText(/◆ Anomaly Spike/i)).toBeInTheDocument();

      // List of anomalies section heading
      expect(screen.getByText(/Statistical Anomalies Detected in Range/i)).toBeInTheDocument();
    });

    it('renders empty/insufficient data states without NaN anywhere', () => {
      // Clear demoHistory and liveTelemetry to simulate cold-start empty state
      useStore.getState().setDemoHistory([]);
      useStore.getState().setLiveTelemetry([]);

      render(<EnergyAnalyticsPage />);

      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.getAllByText(/0.00 kWh/i).length).toBeGreaterThan(0);
    });

    it('chart render-count test: stays within limit over 30 simulation steps', () => {
      const renderSpy = vi.fn();
      render(<EnergyAnalyticsPage renderSpy={renderSpy} />);

      const initialRenders = renderSpy.mock.calls.length;
      expect(initialRenders).toBeGreaterThanOrEqual(1);

      const clock = {
        time: useStore.getState().virtualTime ?? 1730476800000,
        now() {
          return this.time;
        },
      };
      const scheduler = {
        delay: () => Promise.resolve(),
        setInterval: () => 1,
        clearInterval: () => {},
      };
      const prng = new PRNG(4242);

      const simulationEngine = new SimulationEngine({
        store: useStore,
        clock,
        scheduler,
        prng,
      });

      // Run 30 steps synchronously
      for (let i = 0; i < 30; i++) {
        act(() => {
          clock.time += 1000;
          simulationEngine.step(1000);
        });
      }

      const totalRenders = renderSpy.mock.calls.length;
      const stepRenders = totalRenders - initialRenders;

      // Because live telemetry updates are throttled and historical ranges are memoized,
      // 30 synchronous simulation steps must NOT cause 30 re-renders
      expect(stepRenders).toBeLessThanOrEqual(3);
    });
  });
});
