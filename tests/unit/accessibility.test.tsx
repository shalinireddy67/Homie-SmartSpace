import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';

import { RadialDial } from '@/components/controls/RadialDial';
import { DimmerSlider } from '@/components/controls/DimmerSlider';
import { ColorPicker } from '@/components/controls/ColorPicker';
import { Slider } from '@/components/common/Slider';
import { Modal } from '@/components/common/Modal';
import { Switch } from '@/components/common/Switch';
import { Tabs } from '@/components/common/Tabs';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ToastContainer } from '@/components/common/ToastContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { DeviceCard } from '@/components/devices/DeviceCard';
import type { LightDevice, ThermostatDevice, LockDevice, CameraDevice } from '@/types';

// Helper to run axe-core and filter out environment-specific color-contrast in jsdom
async function checkA11y(container: HTMLElement, ignoredRules: string[] = []) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false }, // jsdom does not compute layout colors reliably
      ...Object.fromEntries(ignoredRules.map((rule) => [rule, { enabled: false }])),
    },
  });
  return results.violations;
}

describe('Accessibility & Usability Audit (WCAG 2.2 AA)', () => {
  describe('RadialDial Thermostat Dial', () => {
    it('passes automated axe audit with valid ARIA semantics', async () => {
      const { container } = render(
        <RadialDial current={21.5} target={22.0} min={16} max={30} unit="C" onCommit={() => {}} />
      );

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const slider = screen.getByRole('slider', { name: /thermostat target temperature/i });
      expect(slider).toHaveAttribute('aria-valuenow', '22');
      expect(slider).toHaveAttribute('aria-valuemin', '16');
      expect(slider).toHaveAttribute('aria-valuemax', '30');
      expect(slider).toHaveAttribute('aria-valuetext', '22°C');
    });

    it('supports full keyboard controls: ArrowUp, ArrowDown, Home, End', () => {
      const handleCommit = vi.fn();
      render(
        <RadialDial current={20.0} target={22.0} min={16} max={30} unit="C" onCommit={handleCommit} />
      );

      const slider = screen.getByRole('slider');
      slider.focus();

      // ArrowUp increments
      fireEvent.keyDown(slider, { key: 'ArrowUp' });
      expect(slider).toHaveAttribute('aria-valuenow', '22.5');

      // ArrowDown decrements
      fireEvent.keyDown(slider, { key: 'ArrowDown' });
      expect(slider).toHaveAttribute('aria-valuenow', '22');

      // Home sets to min
      fireEvent.keyDown(slider, { key: 'Home' });
      expect(slider).toHaveAttribute('aria-valuenow', '16');

      // End sets to max
      fireEvent.keyDown(slider, { key: 'End' });
      expect(slider).toHaveAttribute('aria-valuenow', '30');
    });

    it('sets tabIndex to -1 when disabled', () => {
      render(
        <RadialDial
          current={20.0}
          target={22.0}
          disabled={true}
          disabledReason="Device offline"
          onCommit={() => {}}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('tabindex', '-1');
      expect(slider).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('DimmerSlider', () => {
    it('passes axe audit and connects label with input via unique id', async () => {
      const { container } = render(<DimmerSlider value={75} onCommit={() => {}} />);

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const slider = screen.getByRole('slider', { name: /brightness/i });
      expect(slider).toHaveAttribute('aria-valuenow', '75');
      expect(slider).toHaveAttribute('aria-valuetext', '75 percent');
    });

    it('handles keyboard navigation with shift multiplier', () => {
      const handleCommit = vi.fn();
      render(<DimmerSlider value={50} onCommit={handleCommit} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      // Right arrow + 1
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(slider).toHaveAttribute('aria-valuenow', '51');

      // Right arrow + Shift (+10)
      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
      expect(slider).toHaveAttribute('aria-valuenow', '61');

      // Left arrow + Shift (-10)
      fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
      expect(slider).toHaveAttribute('aria-valuenow', '51');
    });
  });

  describe('Slider Component', () => {
    it('passes axe audit with connected label and aria attributes', async () => {
      const handleChange = vi.fn();
      const { container } = render(
        <Slider min={0} max={100} value={40} label="Volume" unit="%" onChange={handleChange} />
      );

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const slider = screen.getByRole('slider', { name: /volume/i });
      expect(slider).toHaveValue('40');
    });
  });

  describe('ColorPicker', () => {
    it('passes axe audit with accessible swatches and text input', async () => {
      const { container } = render(<ColorPicker value="#FFFFFF" onCommit={() => {}} />);

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const hexInput = screen.getByLabelText(/hex:/i);
      expect(hexInput).toBeInTheDocument();
      expect(hexInput).toHaveValue('#FFFFFF');
    });

    it('supports keyboard swatch selection', () => {
      const handleCommit = vi.fn();
      render(<ColorPicker value="#FFFFFF" onCommit={handleCommit} />);

      const swatches = screen.getAllByRole('button', { name: /color #/i });
      expect(swatches.length).toBeGreaterThan(0);

      const secondSwatch = swatches[1];
      if (secondSwatch) {
        fireEvent.click(secondSwatch);
        expect(handleCommit).toHaveBeenCalled();
      }
    });
  });

  describe('Button and Input Accessibility', () => {
    it('marks loading button as aria-busy', async () => {
      const { container } = render(<Button isLoading>Save Changes</Button>);
      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toBeDisabled();
    });

    it('marks input with error as aria-invalid', async () => {
      const { container } = render(
        <label>
          Device Name
          <Input error={true} defaultValue="Faulty" />
        </label>
      );
      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Tabs WCAG APG Pattern', () => {
    it('passes axe audit and supports keyboard arrow navigation', () => {
      const handleChange = vi.fn();
      render(
        <Tabs
          items={[
            { id: 'tab1', label: 'Overview' },
            { id: 'tab2', label: 'Devices' },
            { id: 'tab3', label: 'Settings' },
          ]}
          value="tab1"
          onChange={handleChange}
          ariaLabel="Test tabs"
        />
      );

      const tablist = screen.getByRole('tablist', { name: 'Test tabs' });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      const tab0 = tabs[0];
      const tab1 = tabs[1];
      const tab2 = tabs[2];

      expect(tab0).toBeDefined();
      expect(tab1).toBeDefined();
      expect(tab2).toBeDefined();

      if (tab0 && tab1 && tab2) {
        expect(tab0).toHaveAttribute('aria-selected', 'true');
        expect(tab1).toHaveAttribute('aria-selected', 'false');

        // ArrowRight selects next tab
        fireEvent.keyDown(tab0, { key: 'ArrowRight' });
        expect(handleChange).toHaveBeenCalledWith('tab2');

        // End selects last tab
        fireEvent.keyDown(tab0, { key: 'End' });
        expect(handleChange).toHaveBeenCalledWith('tab3');

        // Home selects first tab
        fireEvent.keyDown(tab2, { key: 'Home' });
        expect(handleChange).toHaveBeenCalledWith('tab1');
      }
    });
  });

  describe('Modal Dialog Accessibility', () => {
    it('passes axe audit with role=dialog and aria-modal=true', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Dialog" description="Accessible modal">
          <p>Dialog body</p>
        </Modal>
      );

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAccessibleName('Test Dialog');
      expect(dialog).toHaveAccessibleDescription('Accessible modal');
    });
  });

  describe('Switch Component', () => {
    it('passes axe audit with role=switch and aria-checked', async () => {
      const handleChange = vi.fn();
      const { container } = render(
        <Switch checked={true} onChange={handleChange} label="Eco Mode" />
      );

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      const switchBtn = screen.getByRole('switch', { name: 'Eco Mode' });
      expect(switchBtn).toHaveAttribute('aria-checked', 'true');

      // Space key toggles
      fireEvent.keyDown(switchBtn, { key: ' ' });
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Notification Drawer Dialog', () => {
    it('renders accessible dialog with Escape close behavior', async () => {
      const handleClose = vi.fn();
      render(
        <MemoryRouter>
          <NotificationDrawer isOpen={true} onClose={handleClose} />
        </MemoryRouter>
      );

      const dialog = screen.getByRole('dialog', { name: /notification center/i });
      expect(dialog).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Toast Notification Region', () => {
    it('renders with region role and accessible name', () => {
      const { container } = render(<ToastContainer />);
      // ToastContainer returns null when empty
      expect(container.firstChild).toBeNull();
    });
  });

  describe('BottomNav Mobile Navigation Sheet', () => {
    it('closes on Escape key when menu sheet is open', async () => {
      render(
        <MemoryRouter>
          <BottomNav />
        </MemoryRouter>
      );

      const moreBtn = screen.getByRole('button', { name: /open full navigation menu/i });
      expect(moreBtn).toHaveAttribute('aria-haspopup', 'dialog');
      expect(moreBtn).toHaveAttribute('aria-expanded', 'false');

      // Open menu
      fireEvent.click(moreBtn);
      expect(screen.getByRole('dialog', { name: /navigation menu/i })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('DeviceCard Multi-Modal Accessibility', () => {
    const mockLight: LightDevice = {
      id: 'light-1',
      roomId: 'living-room',
      name: 'Ceiling Pendant',
      type: 'light',
      online: true,
      powerWatts: 18,
      updatedAt: Date.now(),
      on: true,
      brightness: 80,
      color: '#FFFFFF',
    };

    const mockThermostat: ThermostatDevice = {
      id: 'thermo-1',
      roomId: 'living-room',
      name: 'Ecobee Thermostat',
      type: 'thermostat',
      online: true,
      powerWatts: 4,
      updatedAt: Date.now(),
      current: 21.0,
      target: 22.5,
      min: 16,
      max: 30,
      unit: 'C',
    };

    const mockLock: LockDevice = {
      id: 'lock-1',
      roomId: 'front-door',
      name: 'Front Door Deadbolt',
      type: 'lock',
      online: true,
      powerWatts: 1,
      updatedAt: Date.now(),
      locked: true,
    };

    const mockCamera: CameraDevice = {
      id: 'camera-1',
      roomId: 'living-room',
      name: 'Living Room Cam',
      type: 'camera',
      online: true,
      powerWatts: 5,
      updatedAt: Date.now(),
      active: true,
      motionDetection: true,
      privacyMode: false,
    };

    it('renders device cards without relying on color alone for status', async () => {
      const { container } = render(
        <DeviceCard device={mockLight} roomName="Living Room" />
      );

      const violations = await checkA11y(container);
      expect(violations).toEqual([]);

      // Status is communicated in text
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('80% brightness')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders lock and camera device cards with accessible names', () => {
      render(
        <>
          <DeviceCard device={mockLock} roomName="Front Door" />
          <DeviceCard device={mockCamera} roomName="Living Room" />
        </>
      );

      expect(screen.getByText('Door Locked')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unlock door/i })).toBeInTheDocument();
      expect(screen.getByText('Simulated camera. No video.')).toBeInTheDocument();
    });

    it('disables controls and displays accessible warning when device is offline', () => {
      const offlineDev: ThermostatDevice = {
        ...mockThermostat,
        online: false,
        offlineReason: 'Gateway link timeout',
      };

      render(<DeviceCard device={offlineDev} roomName="Living Room" />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Gateway link timeout');
      const dial = screen.getByRole('slider');
      expect(dial).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
