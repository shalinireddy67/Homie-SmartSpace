import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '@/pages/SettingsPage';
import { useStore, initializeStore } from '@/store';
import { APP_NAME } from '@/constants/branding';

describe('SettingsPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    initializeStore(1730476800000);
  });

  it('renders page header, badges, and all main sections', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByText('Client Configuration')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Appearance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Notification Preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Simulation Engine/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Simulation Controls/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Data Management/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(`About ${APP_NAME}`, 'i') })).toBeInTheDocument();
  });

  it('switches theme between light, dark, and system and persists to localStorage', async () => {
    render(<SettingsPage />);

    const darkRadio = screen.getByRole('radio', { name: /Dark/i });
    fireEvent.click(darkRadio);

    expect(localStorage.getItem('nestora_theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const lightRadio = screen.getByRole('radio', { name: /Light/i });
    fireEvent.click(lightRadio);

    expect(localStorage.getItem('nestora_theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    const sysRadio = screen.getByRole('radio', { name: /System/i });
    fireEvent.click(sysRadio);

    expect(localStorage.getItem('nestora_theme')).toBe('system');
  });

  it('toggles simulation running state and changes speed multiplier', () => {
    render(<SettingsPage />);

    const startBtn = screen.getByRole('button', { name: /Start Simulation/i });
    fireEvent.click(startBtn);

    expect(useStore.getState().running).toBe(true);
    expect(screen.getByRole('button', { name: /Pause Simulation/i })).toBeInTheDocument();

    const speed5xBtn = screen.getByRole('button', { name: 'Set speed to 5x' });
    fireEvent.click(speed5xBtn);

    expect(useStore.getState().speed).toBe(5);
  });

  it('toggles accelerated demo mode and fail next command switch', () => {
    render(<SettingsPage />);

    const accelSwitch = screen.getByRole('switch', { name: /Toggle accelerated demo mode/i });
    fireEvent.click(accelSwitch);

    expect(useStore.getState().acceleratedDemo).toBe(true);

    const failSwitch = screen.getByRole('switch', { name: /Toggle fail next command debug switch/i });
    fireEvent.click(failSwitch);

    expect(useStore.getState().failNextCommand).toBe(true);
    expect(screen.getByText(/Armed \(Next fails\)/i)).toBeInTheDocument();
  });

  it('validates seed input on blur and rejects non-positive integers', () => {
    render(<SettingsPage />);

    const seedInput = screen.getByLabelText(/Simulation PRNG seed/i);

    fireEvent.change(seedInput, { target: { value: '-50' } });
    fireEvent.blur(seedInput);

    expect(screen.getByText(/Seed must be a positive integer/i)).toBeInTheDocument();

    fireEvent.change(seedInput, { target: { value: '9876' } });
    fireEvent.blur(seedInput);

    expect(useStore.getState().seed).toBe(9876);
  });

  it('updates failure probability through range slider', () => {
    render(<SettingsPage />);

    const slider = screen.getByLabelText(/Failure probability slider/i);
    fireEvent.change(slider, { target: { value: '25' } });

    expect(useStore.getState().failureProbability).toBe(0.25);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('updates notification cooldown minutes and toggles toast categories', () => {
    render(<SettingsPage />);

    const cooldownInput = screen.getByLabelText(/Notification cooldown minutes/i);
    fireEvent.change(cooldownInput, { target: { value: '15' } });

    expect(useStore.getState().notificationSettings.cooldownMinutes).toBe(15);

    const energySwitch = screen.getByRole('switch', { name: /Toggle toast alerts for Energy Surges/i });
    fireEvent.click(energySwitch);

    expect(useStore.getState().notificationSettings.toastCategories).not.toContain('energy');
  });

  it('allows manual simulation overrides: temperature, humidity, and device online/offline', () => {
    render(<SettingsPage />);

    const tempSlider = screen.getByLabelText(/Force room temperature/i);
    fireEvent.change(tempSlider, { target: { value: '28' } });

    // Verify rooms and thermostats updated
    expect(useStore.getState().rooms[0]?.ambientTemp).toBe(28);

    const humSlider = screen.getByLabelText(/Force room humidity/i);
    fireEvent.change(humSlider, { target: { value: '65' } });

    expect(useStore.getState().rooms[0]?.ambientHumidity).toBe(65);

    const device = useStore.getState().devices[0];
    if (device) {
      const toggleBtn = screen.getByRole('button', {
        name: device.online ? /Set Device Offline/i : /Bring Device Online/i,
      });
      fireEvent.click(toggleBtn);
      expect(useStore.getState().devices.find((d) => d.id === device.id)?.online).toBe(!device.online);
    }
  });

  it('opens reset confirmation modal and restores defaults on confirm', async () => {
    render(<SettingsPage />);

    // Mutate state first
    useStore.getState().setSpeed(10);
    expect(useStore.getState().speed).toBe(10);

    const resetBtn = screen.getByRole('button', { name: /Reset to Defaults/i });
    fireEvent.click(resetBtn);

    expect(screen.getByRole('heading', { level: 2, name: 'Reset Demo Data' })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Reset/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(useStore.getState().speed).toBe(1);
    });
  });

  it('exports settings JSON on click', () => {
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(<SettingsPage />);

    const exportBtn = screen.getByRole('button', { name: /Export Settings/i });
    fireEvent.click(exportBtn);

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('validates imported JSON and displays error on corrupt payload', async () => {
    render(<SettingsPage />);

    const user = userEvent.setup();
    const badFile = new File(['invalid-json-content{'], 'corrupt.json', { type: 'application/json' });

    const fileInput = document.getElementById('import-settings-file') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, badFile);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to parse JSON file/i)).toBeInTheDocument();
    });
  });

  it('displays about text and simulation disclaimer', () => {
    render(<SettingsPage />);

    expect(screen.getByText(/All data is simulated\. No real devices are connected\./i)).toBeInTheDocument();
  });
});
