import React, { useState, useRef } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { Modal } from '@/components/common/Modal';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { useStore } from '@/store';
import { APP_NAME } from '@/constants/branding';
import {
  STORAGE_KEY,
  validateAndSanitizeState,
  type PersistedStateV1,
} from '@/store/storage';
import type { NotificationCategory, SimulationSpeed } from '@/types';
import {
  Moon,
  Sun,
  Laptop,
  Sliders,
  Thermometer,
  Droplets,
  WifiOff,
  RotateCcw,
  Download,
  Upload,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Activity,
  Info,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { themeMode, setTheme } = useTheme();

  // Store state
  const rooms = useStore((s) => s.rooms);
  const devices = useStore((s) => s.devices);
  const rules = useStore((s) => s.rules);
  const schedules = useStore((s) => s.schedules);
  const setRooms = useStore((s) => s.setRooms);
  const updateDevice = useStore((s) => s.updateDevice);
  const resetToDefaults = useStore((s) => s.resetToDefaults);

  // Simulation controls state
  const running = useStore((s) => s.running);
  const speed = useStore((s) => s.speed);
  const seed = useStore((s) => s.seed);
  const failNextCommand = useStore((s) => s.failNextCommand);
  const failureProbability = useStore((s) => s.failureProbability);
  const acceleratedDemo = useStore((s) => s.acceleratedDemo);

  const setRunning = useStore((s) => s.setRunning);
  const setSpeed = useStore((s) => s.setSpeed);
  const setSeed = useStore((s) => s.setSeed);
  const setFailNextCommand = useStore((s) => s.setFailNextCommand);
  const setFailureProbability = useStore((s) => s.setFailureProbability);
  const setAcceleratedDemo = useStore((s) => s.setAcceleratedDemo);

  // Notification preferences state
  const notificationSettings = useStore((s) => s.notificationSettings);
  const setNotificationSettings = useStore((s) => s.setNotificationSettings);

  // Local UI state
  const [seedInput, setSeedInput] = useState<string>(String(seed));
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Environmental simulation controls
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [targetTemp, setTargetTemp] = useState<number>(24);
  const [targetHumidity, setTargetHumidity] = useState<number>(55);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme change
  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
  };

  // Seed change validation
  const handleSeedBlur = () => {
    const parsed = parseInt(seedInput, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setSeedError('Seed must be a positive integer');
      setSeedInput(String(seed));
    } else {
      setSeedError(null);
      setSeed(parsed);
    }
  };

  // Failure probability slider (0 - 100%)
  const handleProbabilityChange = (percent: number) => {
    const clamped = Math.max(0, Math.min(100, percent));
    setFailureProbability(clamped / 100);
  };

  // Notification category toggle
  const handleCategoryToggle = (category: NotificationCategory) => {
    const current = notificationSettings.toastCategories;
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setNotificationSettings({ toastCategories: next });
  };

  // Force temperature
  const handleForceTemperature = (temp: number) => {
    setTargetTemp(temp);
    const updatedRooms = rooms.map((r) =>
      !selectedRoomId || r.id === selectedRoomId ? { ...r, ambientTemp: temp } : r
    );
    setRooms(updatedRooms);

    for (const d of devices) {
      if (d.type === 'thermostat' && (!selectedRoomId || d.roomId === selectedRoomId)) {
        updateDevice(d.id, { current: temp });
      }
    }
  };

  // Force humidity
  const handleForceHumidity = (hum: number) => {
    setTargetHumidity(hum);
    const updatedRooms = rooms.map((r) =>
      !selectedRoomId || r.id === selectedRoomId ? { ...r, ambientHumidity: hum } : r
    );
    setRooms(updatedRooms);
  };

  // Toggle device offline/online
  const handleToggleDeviceOffline = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    if (!dev) return;
    const becomingOffline = dev.online;
    updateDevice(deviceId, {
      online: !becomingOffline,
      offlineReason: becomingOffline ? 'Simulated connection drop' : undefined,
    });
  };

  // Reset Demo Data
  const handleConfirmReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored
    }
    resetToDefaults();
    setIsResetModalOpen(false);
  };

  // Export Settings as JSON
  const handleExportSettings = () => {
    const exportData: PersistedStateV1 = {
      version: 1,
      devices,
      rules,
      schedules,
      notifications: [],
      notificationSettings,
      simulation: {
        speed,
        seed,
        failNextCommand,
        failureProbability,
        acceleratedDemo,
      },
      theme: themeMode,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nestora-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import Settings from file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validated = validateAndSanitizeState(parsed);

        if (!validated || typeof parsed !== 'object' || parsed === null) {
          setImportError('Invalid configuration file. State remains unchanged.');
          setImportSuccess(null);
          return;
        }

        // Apply validated state to store
        if (validated.devices) {
          useStore.setState({ devices: validated.devices });
        }
        if (validated.rules) {
          useStore.setState({ rules: validated.rules });
        }
        if (validated.schedules) {
          useStore.setState({ schedules: validated.schedules });
        }
        if (validated.simulation) {
          useStore.setState({
            speed: validated.simulation.speed,
            seed: validated.simulation.seed,
            failNextCommand: validated.simulation.failNextCommand,
            failureProbability: validated.simulation.failureProbability,
            acceleratedDemo: validated.simulation.acceleratedDemo ?? false,
          });
          setSeedInput(String(validated.simulation.seed));
        }
        if (validated.notificationSettings) {
          setNotificationSettings(validated.notificationSettings);
        }
        if (validated.theme) {
          setTheme(validated.theme);
        }

        setImportError(null);
        setImportSuccess('Settings imported successfully.');
        setTimeout(() => setImportSuccess(null), 4000);
      } catch {
        setImportError('Failed to parse JSON file. State remains unchanged.');
        setImportSuccess(null);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const targetDev = devices.find((d) => d.id === selectedDeviceId) || devices[0];
  const speeds: SimulationSpeed[] = [1, 2, 5, 10];
  const allCategories: { id: NotificationCategory; label: string }[] = [
    { id: 'device', label: 'Device Alerts' },
    { id: 'security', label: 'Security & Access' },
    { id: 'energy', label: 'Energy Surges' },
    { id: 'system', label: 'System Lifecycle' },
    { id: 'automation', label: 'Automations' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            System configuration, simulation engine parameters, appearance, and persistent state.
          </p>
        </div>
        <Badge variant="accent" className="self-start sm:self-auto">
          Client Configuration
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Card */}
        <Card className="p-6 bg-surface border border-border space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Sun className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-text">Appearance</h2>
              <p className="text-xs text-text-muted">
                Control interface theme. Stored in LocalStorage to eliminate flash on reload.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-text block">Theme Preference</span>
            <div
              role="radiogroup"
              aria-label="Theme mode selector"
              className="grid grid-cols-3 gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'light'}
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all focus-ring ${
                  themeMode === 'light'
                    ? 'border-accent bg-accent/10 text-accent font-semibold shadow-sm'
                    : 'border-border bg-surface-subtle text-text hover:bg-surface'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'dark'}
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all focus-ring ${
                  themeMode === 'dark'
                    ? 'border-accent bg-accent/10 text-accent font-semibold shadow-sm'
                    : 'border-border bg-surface-subtle text-text hover:bg-surface'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'system'}
                onClick={() => handleThemeChange('system')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all focus-ring ${
                  themeMode === 'system'
                    ? 'border-accent bg-accent/10 text-accent font-semibold shadow-sm'
                    : 'border-border bg-surface-subtle text-text hover:bg-surface'
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>System</span>
              </button>
            </div>
            <p className="text-[11px] text-text-muted">
              System mode automatically matches your operating system&apos;s dark or light display settings.
            </p>
          </div>
        </Card>

        {/* Notifications Preferences */}
        <Card className="p-6 bg-surface border border-border space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Bell className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-text">Notification Preferences</h2>
              <p className="text-xs text-text-muted">
                Tune alert deduplication cooldowns and ephemeral toast display.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="cooldown-input" className="text-xs font-semibold text-text block mb-1">
                Deduplication Cooldown (Minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="cooldown-input"
                  type="number"
                  min="1"
                  max="60"
                  value={notificationSettings.cooldownMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      setNotificationSettings({ cooldownMinutes: val });
                    }
                  }}
                  className="w-24 px-3 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text focus-ring font-mono"
                  aria-label="Notification cooldown minutes"
                />
                <span className="text-xs text-text-muted">minutes between identical condition alerts</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Suppresses repetitive notifications for ongoing device alerts and recurring anomalies.
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-text block mb-2">
                Toast Alert Categories
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allCategories.map((cat) => {
                  const active = notificationSettings.toastCategories.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-border text-xs cursor-pointer hover:bg-surface transition-colors"
                    >
                      <span className="text-text font-medium">{cat.label}</span>
                      <Switch
                        checked={active}
                        onChange={() => handleCategoryToggle(cat.id)}
                        aria-label={`Toggle toast alerts for ${cat.label}`}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-text-muted mt-2">
                Determines which categories show temporary floating toast cards in the bottom-right corner.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Simulation Engine Parameters */}
      <Card className="p-6 bg-surface border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-text">Simulation Engine</h2>
              <p className="text-xs text-text-muted">
                Configure runtime clock multiplier, PRNG seed, and synthetic command failure rates.
              </p>
            </div>
          </div>
          <Badge variant={running ? 'success' : 'outline'} size="sm">
            {running ? 'Running' : 'Paused'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Start / Pause */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-text block">Simulation State</span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Starts or pauses environmental drift, scheduled actions, and automated telemetry updates.
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant={running ? 'outline' : 'primary'}
                size="sm"
                className="w-full"
                onClick={() => setRunning(!running)}
              >
                {running ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Pause Simulation</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Start Simulation</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Speed Multiplier */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-text block">Playback Speed</span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Multiplies virtual time speed to observe diurnal heating curves and recurring rules faster.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-2">
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`py-1.5 text-xs font-mono rounded-lg border transition-all focus-ring ${
                    speed === s
                      ? 'border-accent bg-accent text-white font-bold'
                      : 'border-border bg-surface text-text hover:bg-surface-subtle'
                  }`}
                  aria-label={`Set speed to ${s}x`}
                  aria-pressed={speed === s}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Accelerated Demo Mode */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-text block">Accelerated Demo Mode</span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Fast-forwards virtual clock progression to trigger automations and anomalies in rapid demo sequences.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono font-medium text-text">
                {acceleratedDemo ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={acceleratedDemo}
                onChange={() => setAcceleratedDemo(!acceleratedDemo)}
                aria-label="Toggle accelerated demo mode"
              />
            </div>
          </div>

          {/* Deterministic Seed */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5 flex flex-col justify-between">
            <div>
              <label htmlFor="seed-input" className="text-xs font-semibold text-text block">
                PRNG Seed
              </label>
              <p className="text-[11px] text-text-muted mt-0.5">
                Seed used by Mulberry32 generator for reproducible weather drift, noise, and telemetry.
              </p>
            </div>
            <div className="space-y-1 pt-2">
              <input
                id="seed-input"
                type="number"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onBlur={handleSeedBlur}
                className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus-ring font-mono"
                aria-label="Simulation PRNG seed"
              />
              {seedError ? (
                <p className="text-[10px] text-danger">{seedError}</p>
              ) : (
                <p className="text-[10px] text-text-muted">Applies when resetting or regenerating demo data</p>
              )}
            </div>
          </div>

          {/* Failure Probability */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text">Failure Probability</span>
              <span className="text-xs font-mono font-bold text-accent">
                {Math.round(failureProbability * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Probability that commands encounter simulated packet timeout and initiate rollback.
            </p>
            <div className="space-y-1 pt-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(failureProbability * 100)}
                onChange={(e) => handleProbabilityChange(parseInt(e.target.value, 10) || 0)}
                aria-label="Failure probability slider"
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>0% (Never)</span>
                <span>Default 5%</span>
                <span>100% (Always)</span>
              </div>
            </div>
          </div>

          {/* Fail Next Command */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-text block">Fail Next Command</span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Deterministic debugging switch: forces the very next command to fail and trigger rollback fencing.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span
                className={`text-xs font-mono font-medium ${
                  failNextCommand ? 'text-danger font-bold' : 'text-text-muted'
                }`}
              >
                {failNextCommand ? 'Armed (Next fails)' : 'Disarmed'}
              </span>
              <Switch
                checked={failNextCommand}
                onChange={() => setFailNextCommand(!failNextCommand)}
                aria-label="Toggle fail next command debug switch"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Simulation Controls Panel (Force Temp, Humidity, Offline) */}
      <Card className="p-6 bg-surface border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-text">Simulation Controls</h2>
              <p className="text-xs text-text-muted">
                Manually perturb environmental sensors and device online/offline states to verify triggers.
              </p>
            </div>
          </div>
          <Badge variant="outline" size="sm">
            Manual Override
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tool 1: Force Temperature */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-text">
                <Thermometer className="h-4 w-4 text-accent" />
                <span>Force Temperature</span>
              </div>
              <span className="font-mono text-xs font-bold text-accent">{targetTemp}°C</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Manually overwrite room temperature to immediately test climate triggers.
            </p>
            <div className="space-y-2">
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus-ring"
                aria-label="Select target room for temperature override"
              >
                <option value="">All Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                type="range"
                min="15"
                max="35"
                step="0.5"
                value={targetTemp}
                onChange={(e) => handleForceTemperature(parseFloat(e.target.value) || 20)}
                aria-label="Force room temperature"
                className="w-full accent-accent"
              />
              <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>15°C</span>
                <span>Normal 22°C</span>
                <span>35°C</span>
              </div>
            </div>
          </div>

          {/* Tool 2: Force Humidity */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-text">
                <Droplets className="h-4 w-4 text-accent" />
                <span>Force Humidity</span>
              </div>
              <span className="font-mono text-xs font-bold text-accent">{targetHumidity}%</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Adjust ambient indoor moisture to evaluate humidity threshold rules.
            </p>
            <div className="space-y-2">
              <input
                type="range"
                min="20"
                max="80"
                step="1"
                value={targetHumidity}
                onChange={(e) => handleForceHumidity(parseInt(e.target.value, 10) || 50)}
                aria-label="Force room humidity"
                className="w-full accent-accent"
              />
              <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>20%</span>
                <span>Normal ~50%</span>
                <span>80%</span>
              </div>
            </div>
          </div>

          {/* Tool 3: Set Device Offline / Online */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text">
              <WifiOff className="h-4 w-4 text-accent" />
              <span>Device Connectivity</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Simulate network ping drops or restore connection for any device.
            </p>
            <div className="space-y-2">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus-ring"
                aria-label="Select device to toggle online/offline"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.online ? 'Online' : 'Offline'})
                  </option>
                ))}
              </select>

              {targetDev && (
                <Button
                  type="button"
                  variant={targetDev.online ? 'danger' : 'outline'}
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleToggleDeviceOffline(targetDev.id)}
                >
                  {targetDev.online ? 'Set Device Offline' : 'Bring Device Online'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management Section */}
      <Card className="p-6 bg-surface border border-border space-y-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-base font-bold text-text">Data Management</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Reset to seed defaults or backup and restore custom devices, rules, and schedules.
          </p>
        </div>

        {/* Feedback Messages */}
        {importError && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-medium"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {importSuccess && (
          <div
            role="status"
            className="flex items-center gap-2 p-3 rounded-xl border border-success/30 bg-success/10 text-success text-xs font-medium"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Reset Demo Data */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-text">Reset Demo Data</h3>
              <p className="text-[11px] text-text-muted mt-1">
                Clears saved storage and regenerates default seed devices and automations.
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </Button>
          </div>

          {/* Export Settings */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-text">Export Configuration</h3>
              <p className="text-[11px] text-text-muted mt-1">
                Download all user devices, rules, schedules, and simulation settings as JSON.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportSettings}
            >
              <Download className="h-3.5 w-3.5 text-accent" />
              <span>Export Settings</span>
            </Button>
          </div>

          {/* Import Settings */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-text">Import Configuration</h3>
              <p className="text-[11px] text-text-muted mt-1">
                Upload and validate a previously exported settings JSON file.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="import-settings-file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 text-accent" />
                <span>Import Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* About Section */}
      <Card className="p-6 bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-text">About {APP_NAME}</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-muted border-t border-border pt-3">
          <div>
            <span className="font-semibold text-text">{APP_NAME}</span> &mdash; Version 0.1.0 (Production Build)
          </div>
          <div className="italic text-accent font-medium">
            All data is simulated. No real devices are connected.
          </div>
        </div>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Demo Data"
        description="Are you sure you want to restore factory default data?"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            This action will clear all local modifications from LocalStorage and reload initial devices,
            rules, and schedules using seed <span className="font-mono font-bold text-text">{seed}</span>.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Confirm Reset</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default SettingsPage;
