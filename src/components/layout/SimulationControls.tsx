import React from 'react';
import { useStore } from '@/store';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import { Play, Pause, Activity } from 'lucide-react';
import type { SimulationSpeed } from '@/types';

export const SimulationControls: React.FC = () => {
  const running = useStore((s) => s.running);
  const speed = useStore((s) => s.speed);
  const failNextCommand = useStore((s) => s.failNextCommand);

  const setRunning = useStore((s) => s.setRunning);
  const setSpeed = useStore((s) => s.setSpeed);
  const setFailNextCommand = useStore((s) => s.setFailNextCommand);

  const speedOptions: SimulationSpeed[] = [1, 2, 5, 10];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-border bg-surface-subtle/50 text-xs sm:text-sm">
      <div className="flex items-center gap-3">
        {/* Simulated data badge */}
        <Badge
          variant="outline"
          className="border-warning/40 text-warning bg-warning/5 font-medium flex items-center gap-1.5"
        >
          <Activity className="h-3 w-3 animate-pulse" aria-hidden="true" />
          <span>Simulated data</span>
        </Badge>

        {/* Start / Pause Button */}
        <Button
          variant={running ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setRunning(!running)}
          aria-label={running ? 'Pause simulation engine' : 'Start simulation engine'}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          {running ? (
            <>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Start</span>
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Speed Selector */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Simulation speed">
          <span className="text-xs text-text-muted font-medium">Speed:</span>
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-surface">
            {speedOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSpeed(opt)}
                aria-pressed={speed === opt}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                  speed === opt
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {opt}x
              </button>
            ))}
          </div>
        </div>

        {/* Fail Next Command Toggle */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <Switch
            checked={failNextCommand}
            onChange={setFailNextCommand}
            label="Fail next command"
          />
          <span
            className={`text-xs font-semibold ${
              failNextCommand ? 'text-danger' : 'text-text-muted'
            }`}
          >
            {failNextCommand ? 'Armed' : 'Off'}
          </span>
        </div>
      </div>
    </div>
  );
};
