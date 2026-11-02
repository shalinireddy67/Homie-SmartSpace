import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '@/store';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { RoomsDevicesPage } from '@/pages/RoomsDevicesPage';
import { ToastContainer } from '@/components/common/ToastContainer';
import type { LightDevice, ThermostatDevice, LockDevice, CameraDevice } from '@/types';

describe('Rooms & Devices Feature Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
  });

  describe('DeviceCard Controls & Commands', () => {
    it('light toggle dispatches command and updates store state', async () => {
      const user = userEvent.setup();
      const livingLight = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
      expect(livingLight.on).toBe(true);

      render(
        <DeviceCard
          device={livingLight}
          roomName="Living Room"
        />
      );

      const powerSwitch = screen.getByRole('switch', { name: /toggle power for/i });
      expect(powerSwitch).toHaveAttribute('aria-checked', 'true');

      await user.click(powerSwitch);

      await waitFor(() => {
        const updated = useStore.getState().devices.find((d) => d.id === livingLight.id) as LightDevice;
        expect(updated.on).toBe(false);
      });
    });

    it('dimmer arrow key changes brightness through command and 0 turns off', async () => {
      const livingLight = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;

      render(
        <DeviceCard
          device={livingLight}
          roomName="Living Room"
        />
      );

      const slider = screen.getByRole('slider', { name: /brightness dimmer/i });
      slider.focus();

      // Home key sets to 0
      fireEvent.keyDown(slider, { key: 'Home' });

      await waitFor(() => {
        const updated = useStore.getState().devices.find((d) => d.id === livingLight.id) as LightDevice;
        expect(updated.brightness).toBe(0);
        expect(updated.on).toBe(false);
      });
    });

    it('thermostat dial updates target temperature through command', async () => {
      const thermo = useStore.getState().devices.find((d) => d.id === 'dev-therm-living') as ThermostatDevice;
      const initialTarget = thermo.target;

      render(
        <DeviceCard
          device={thermo}
          roomName="Living Room"
        />
      );

      const dial = screen.getByRole('slider', { name: /thermostat target temperature/i });
      dial.focus();

      fireEvent.keyDown(dial, { key: 'ArrowUp' });

      await waitFor(() => {
        const updated = useStore.getState().devices.find((d) => d.id === thermo.id) as ThermostatDevice;
        expect(updated.target).toBe(initialTarget + 0.5);
      });
    });

    it('lock confirm modal appears, cancel keeps state, confirm updates lock', async () => {
      const user = userEvent.setup();
      const lockDev = useStore.getState().devices.find((d) => d.id === 'dev-lock-front') as LockDevice;
      expect(lockDev.locked).toBe(true);

      render(
        <DeviceCard
          device={lockDev}
          roomName="Living Room"
        />
      );

      // Click unlock trigger button
      const unlockButton = screen.getByRole('button', { name: /unlock front entry deadbolt/i });
      await user.click(unlockButton);

      // Confirmation modal should be visible
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(screen.getByText(/confirm door unlock/i)).toBeInTheDocument();

      // Cancel button should keep state
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const afterCancel = useStore.getState().devices.find((d) => d.id === lockDev.id) as LockDevice;
      expect(afterCancel.locked).toBe(true);

      // Open modal again and confirm
      await user.click(screen.getByRole('button', { name: /unlock front entry deadbolt/i }));
      const confirmButton = screen.getByRole('button', { name: /confirm unlock/i });
      await user.click(confirmButton);

      await waitFor(() => {
        const updated = useStore.getState().devices.find((d) => d.id === lockDev.id) as LockDevice;
        expect(updated.locked).toBe(false);
      });
    });

    it('camera switches toggle active, motion, and privacy mode', async () => {
      const user = userEvent.setup();
      const camera = useStore.getState().devices.find((d) => d.id === 'dev-cam-doorbell') as CameraDevice;

      render(
        <DeviceCard
          device={camera}
          roomName="Outdoor Patio"
        />
      );

      expect(screen.getByText('Simulated camera. No video.')).toBeInTheDocument();

      const motionSwitch = screen.getByRole('switch', { name: /toggle motion detection/i });
      await user.click(motionSwitch);

      await waitFor(() => {
        const updated = useStore.getState().devices.find((d) => d.id === camera.id) as CameraDevice;
        expect(updated.motionDetection).toBe(!camera.motionDetection);
      });
    });

    it('offline card has controls disabled, reason visible, and ignores interactions', async () => {
      const user = userEvent.setup();
      const offlineDev = useStore.getState().devices.find((d) => !d.online) as CameraDevice;
      expect(offlineDev).toBeDefined();

      const handleCommand = vi.fn();

      render(
        <DeviceCard
          device={offlineDev}
          roomName="Outdoor Patio"
          onCommand={handleCommand}
        />
      );

      // Offline badge & reason visible
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText(offlineDev.offlineReason!)).toBeInTheDocument();

      // Switch should have aria-disabled="true"
      const powerSwitch = screen.getByRole('switch', { name: /toggle active power/i });
      expect(powerSwitch).toHaveAttribute('aria-disabled', 'true');

      // Attempt interaction
      await user.click(powerSwitch);

      expect(handleCommand).not.toHaveBeenCalled();
    });

    it('failNextCommand armed causes light change to roll back, show toast, and reset flag', async () => {
      const user = userEvent.setup();
      useStore.getState().setFailNextCommand(true);
      expect(useStore.getState().failNextCommand).toBe(true);

      const light = useStore.getState().devices.find((d) => d.id === 'dev-light-living') as LightDevice;
      const initialBrightness = light.brightness;

      render(
        <>
          <ToastContainer />
          <DeviceCard device={light} roomName="Living Room" />
        </>
      );

      const powerSwitch = screen.getByRole('switch', { name: /toggle power for/i });
      await user.click(powerSwitch);

      // Wait for execution and rollback
      await waitFor(() => {
        // Flag should be consumed and reset to false
        expect(useStore.getState().failNextCommand).toBe(false);
      });

      await waitFor(() => {
        // Store light state rolled back to original
        const currentLight = useStore.getState().devices.find((d) => d.id === light.id) as LightDevice;
        expect(currentLight.on).toBe(true);
        expect(currentLight.brightness).toBe(initialBrightness);
      });

      // Toast should appear explaining the failure
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/command failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Memoization & Render Performance', () => {
    it('changing one device does not rerender other cards', () => {
      const spyA = vi.fn();
      const spyB = vi.fn();

      const TestHarness: React.FC = () => {
        const devices = useStore((s) => s.devices);
        const devA = devices.find((d) => d.id === 'dev-light-living')!;
        const devB = devices.find((d) => d.id === 'dev-therm-living')!;
        return (
          <div>
            <DeviceCard device={devA} roomName="Living Room" renderSpy={spyA} />
            <DeviceCard device={devB} roomName="Living Room" renderSpy={spyB} />
          </div>
        );
      };

      render(<TestHarness />);

      expect(spyA).toHaveBeenCalledTimes(1);
      expect(spyB).toHaveBeenCalledTimes(1);

      // Mutate device A in store inside act
      act(() => {
        useStore.getState().updateDevice('dev-light-living', { brightness: 42 });
      });

      // Device A should re-render; Device B should NOT re-render
      expect(spyA).toHaveBeenCalledTimes(2);
      expect(spyB).toHaveBeenCalledTimes(1);
    });
  });

  describe('RoomsDevicesPage Filtering & Search', () => {
    it('filters devices by room tab', async () => {
      const user = userEvent.setup();
      render(<RoomsDevicesPage />);

      // Initially all devices visible
      const initialCards = screen.getAllByTestId(/^device-card-/);
      expect(initialCards.length).toBe(useStore.getState().devices.length);

      // Click "Primary Bedroom" room tab
      const bedroomTab = screen.getByRole('tab', { name: /primary bedroom/i });
      await user.click(bedroomTab);

      const bedroomDevices = useStore.getState().devices.filter((d) => d.roomId === 'room-bedroom');
      const filteredCards = screen.getAllByTestId(/^device-card-/);
      expect(filteredCards.length).toBe(bedroomDevices.length);
    });

    it('filters devices by type filter button', async () => {
      const user = userEvent.setup();
      render(<RoomsDevicesPage />);

      // Click "Thermostats" type filter
      const thermoFilter = screen.getByRole('button', { name: /thermostats/i });
      await user.click(thermoFilter);

      const thermostats = useStore.getState().devices.filter((d) => d.type === 'thermostat');
      const filteredCards = screen.getAllByTestId(/^device-card-/);
      expect(filteredCards.length).toBe(thermostats.length);
    });

    it('filters devices by search query', async () => {
      const user = userEvent.setup();
      render(<RoomsDevicesPage />);

      const searchInput = screen.getByLabelText(/search devices or rooms/i);
      await user.type(searchInput, 'Kitchen');

      const kitchenDevices = useStore.getState().devices.filter((d) => d.roomId === 'room-kitchen');
      const filteredCards = screen.getAllByTestId(/^device-card-/);
      expect(filteredCards.length).toBe(kitchenDevices.length);
    });

    it('combines room, type, and search filters with AND logic', async () => {
      const user = userEvent.setup();
      render(<RoomsDevicesPage />);

      // 1. Select Living Room
      await user.click(screen.getByRole('tab', { name: /living room/i }));

      // 2. Select Lights type
      await user.click(screen.getByRole('button', { name: /lights/i }));

      // 3. Search "Chandelier"
      const searchInput = screen.getByLabelText(/search devices or rooms/i);
      await user.type(searchInput, 'Chandelier');

      const expected = useStore.getState().devices.filter(
        (d) => d.roomId === 'room-living' && d.type === 'light' && d.name.includes('Chandelier')
      );
      const filteredCards = screen.getAllByTestId(/^device-card-/);
      expect(filteredCards.length).toBe(expected.length);
      expect(filteredCards.length).toBeGreaterThan(0);
    });

    it('renders empty state when no devices match and clear button resets filters', async () => {
      const user = userEvent.setup();
      render(<RoomsDevicesPage />);

      const searchInput = screen.getByLabelText(/search devices or rooms/i);
      await user.type(searchInput, 'non-existent-device-xyz-1234');

      expect(screen.getByTestId('empty-devices-state')).toBeInTheDocument();
      expect(screen.getByText('No devices found')).toBeInTheDocument();

      // Click Clear filters button in empty state
      const clearBtn = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearBtn);

      // All devices should be restored
      expect(screen.queryByTestId('empty-devices-state')).not.toBeInTheDocument();
      const restoredCards = screen.getAllByTestId(/^device-card-/);
      expect(restoredCards.length).toBe(useStore.getState().devices.length);
    });
  });
});
