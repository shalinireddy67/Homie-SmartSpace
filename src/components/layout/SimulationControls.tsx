import React from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { Play, Pause } from 'lucide-react';
import type { SimulationSpeed } from '@/types';

export const SimulationControls: React.FC<{ compact?: boolean }> = ({ compact = true }) => {
  const running = useStore((s) => s.running);
  const speed = useStore((s) => s.speed);
  const failNextCommand = useStore((s) => s.failNextCommand);

  const setRunning = useStore((s) => s.setRunning);
  const setSpeed = useStore((s) => s.setSpeed);
  const setFailNextCommand = useStore((s) => s.setFailNextCommand);

  const speedOptions: SimulationSpeed[] = [1, 2, 5, 10];

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-elevated border border-border-subtle text-xs ${
        compact ? 'shadow-xs' : ''
      }`}
      role="group"
      aria-label="Simulation engine controls"
    >
      {/* Simulation status pill */}
      <div className="flex items-center gap-1.5 select-none pr-1.5 border-r border-border-subtle">
        <span
          className={`h-2 w-2 rounded-full ${
            running ? 'bg-success animate-pulse' : 'bg-warning'
          }`}
          aria-hidden="true"
        />
        <span className="hidden xl:inline font-semibold text-text-muted text-[11px]">
          Simulated data
        </span>
      </div>

      {/* Start / Pause Button */}
      <Button
        variant={running ? 'secondary' : 'primary'}
        size="sm"
        onClick={() => setRunning(!running)}
        aria-label={running ? 'Pause simulation engine' : 'Start simulation engine'}
        className="px-3 py-1.5 text-xs gap-1.5 rounded-full min-h-[44px] min-w-[44px]"
      >
        {running ? (
          <>
            <Pause className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Pause</span>
          </>
        ) : (
          <>
            <Play className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Start</span>
          </>
        )}
      </Button>

      {/* Speed Selector */}
      <div className="hidden lg:flex items-center gap-1">
        <label htmlFor="sim-speed-select" className="sr-only">
          Simulation speed
        </label>
        <select
          id="sim-speed-select"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value) as SimulationSpeed)}
          className="min-h-[44px] px-2.5 rounded-full bg-surface text-text text-xs border border-border focus-ring font-mono"
          aria-label="Simulation speed multiplier"
        >
          {speedOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}x speed
            </option>
          ))}
        </select>
      </div>

      {/* Fail Next Command Switch */}
      <div className="flex items-center gap-1.5 pl-1.5 border-l border-border-subtle">
        <Switch
          checked={failNextCommand}
          onChange={setFailNextCommand}
          aria-label="Fail next command"
        />
        <span
          className={`text-[11px] font-medium hidden xl:inline ${
            failNextCommand ? 'text-danger font-semibold' : 'text-text-muted'
          }`}
        >
          {failNextCommand ? 'Fail armed' : 'Fail next'}
        </span>
      </div>
    </div>
  );
};
