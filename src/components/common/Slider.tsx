import { forwardRef } from 'react';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  unit?: string;
  id?: string;
  className?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      min,
      max,
      step = 1,
      value,
      onChange,
      disabled = false,
      label,
      unit = '',
      id,
      className = '',
    },
    ref
  ) => {
    const percentage = Math.min(
      100,
      Math.max(0, ((value - min) / (max - min)) * 100)
    );

    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        {label && (
          <div className="flex items-center justify-between text-xs font-medium text-text-muted">
            <label htmlFor={id}>{label}</label>
            <span className="font-mono text-text tabular-nums">
              {value}
              {unit}
            </span>
          </div>
        )}
        <div className="relative flex items-center h-6">
          <input
            ref={ref}
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-elevated border border-border focus-ring disabled:opacity-50 disabled:cursor-not-allowed accent-accent"
            style={{
              background: `linear-gradient(to right, rgb(var(--color-accent)) 0%, rgb(var(--color-accent)) ${percentage}%, rgb(var(--color-surface-elevated)) ${percentage}%, rgb(var(--color-surface-elevated)) 100%)`,
            }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
