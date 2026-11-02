import React, { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store';
import type { Rule } from '@/types';
import {
  Moon,
  Sun,
  Sliders,
  Thermometer,
  Droplets,
  WifiOff,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const rooms = useStore((s) => s.rooms);
  const devices = useStore((s) => s.devices);
  const setRooms = useStore((s) => s.setRooms);
  const updateDevice = useStore((s) => s.updateDevice);
  const addRule = useStore((s) => s.addRule);
  const resetToDefaults = useStore((s) => s.resetToDefaults);

  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [targetTemp, setTargetTemp] = useState<number>(24);
  const [targetHumidity, setTargetHumidity] = useState<number>(55);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || '');
  const [demoLoadedMsg, setDemoLoadedMsg] = useState<string | null>(null);

  // Force temperature in selected room (or all rooms)
  const handleForceTemperature = (temp: number) => {
    setTargetTemp(temp);
    const updatedRooms = rooms.map((r) =>
      !selectedRoomId || r.id === selectedRoomId ? { ...r, ambientTemp: temp } : r
    );
    setRooms(updatedRooms);

    // Also update any thermostats in those rooms so reading matches
    for (const d of devices) {
      if (d.type === 'thermostat' && (!selectedRoomId || d.roomId === selectedRoomId)) {
        updateDevice(d.id, { current: temp });
      }
    }
  };

  // Force humidity in selected room
  const handleForceHumidity = (hum: number) => {
    setTargetHumidity(hum);
    const updatedRooms = rooms.map((r) =>
      !selectedRoomId || r.id === selectedRoomId ? { ...r, ambientHumidity: hum } : r
    );
    setRooms(updatedRooms);
  };

  // Toggle device offline/online state
  const handleToggleDeviceOffline = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    if (!dev) return;
    const becomingOffline = dev.online;
    updateDevice(deviceId, {
      online: !becomingOffline,
      offlineReason: becomingOffline ? 'Simulated connection drop' : undefined,
    });
  };

  // Load demo automation helper
  const handleLoadDemoAutomation = () => {
    const therm = devices.find((d) => d.type === 'thermostat') || devices[0];
    const light = devices.find((d) => d.type === 'light') || devices[1] || devices[0];

    const demoRule: Rule = {
      id: `rule-demo-${Date.now()}`,
      name: 'Eco Climate & Lighting',
      description: 'Raises AC target when temperature exceeds 23°C and adjusts evening lighting.',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: `cond-temp-${Date.now()}`,
            field: 'ambientTemp',
            operator: '>',
            value: 23,
          },
        ],
      },
      actions: [
        ...(therm
          ? [
              {
                id: `act-therm-${Date.now()}`,
                deviceId: therm.id,
                field: 'target',
                value: 21,
              },
            ]
          : []),
        ...(light
          ? [
              {
                id: `act-light-${Date.now()}`,
                deviceId: light.id,
                field: 'brightness',
                value: 40,
              },
            ]
          : []),
      ],
      timeWindow: {
        start: '08:00',
        end: '23:00',
      },
      cooldownMinutes: 2,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    addRule(demoRule);
    setDemoLoadedMsg('Demo automation "Eco Climate & Lighting" loaded successfully!');
    setTimeout(() => setDemoLoadedMsg(null), 4000);
  };

  const targetDev = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            System preferences, theme appearance, simulation controls, and debugging options.
          </p>
        </div>
        <Badge variant="outline">Client Configuration</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Theme */}
        <Card className="p-5 bg-surface border border-border space-y-4">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-warning" />}
            Appearance & Theme
          </h2>
          <p className="text-xs text-text-muted">
            Configure application appearance. Preferences are persisted locally and prevent theme flash on initial load.
          </p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-text">Dark Mode</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              <Switch
                checked={theme === 'dark'}
                onChange={toggleTheme}
                aria-label="Toggle dark mode theme"
              />
            </div>
          </div>
        </Card>

        {/* Demo Automations Helper */}
        <Card className="p-5 bg-surface border border-border space-y-4">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Automation Helpers
          </h2>
          <p className="text-xs text-text-muted">
            Quickly provision ready-to-test automation rules for demonstration and verification without manual builder setup.
          </p>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadDemoAutomation}
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Load Demo Automation</span>
            </Button>
            {demoLoadedMsg && (
              <p className="text-xs text-success font-medium mt-2">{demoLoadedMsg}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Simulation Tools Panel */}
      <Card className="p-6 bg-surface border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-text">Simulation tools</h2>
              <p className="text-xs text-text-muted">
                Controls simulated environmental drift and device telemetry. Used for live demonstrations and testing.
              </p>
            </div>
          </div>
          <Badge variant="accent" size="sm">
            Simulation Control
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
                className="w-full px-2 py-1 text-xs bg-surface border border-border rounded text-text focus-ring"
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
                <span>Trigger &gt; 23°C</span>
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

        {/* Reset Store Action */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-text">Reset System State</h3>
            <p className="text-[11px] text-text-muted">
              Clears local changes and restores seed defaults across all devices, automations, and settings.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetToDefaults()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Seed Defaults</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
