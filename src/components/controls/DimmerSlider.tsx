import React, { useState, useEffect, useRef, useCallback, useId } from 'react';

export interface DimmerSliderProps {
  value: number; // 0 - 100
  onCommit: (val: number) => void;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
  id?: string;
}

export const DimmerSlider: React.FC<DimmerSliderProps> = ({
  value,
  onCommit,
  disabled = false,
  disabledReason,
  ariaLabel = 'Light brightness dimmer',
  id,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [localValue, setLocalValue] = useState<number>(value);
  const isDraggingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const commitValue = useCallback(
    (newVal: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      onCommit(newVal);
    },
    [onCommit]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextVal = Math.round(Number(e.target.value));
    setLocalValue(nextVal);
    isDraggingRef.current = true;

    // Debounce commit in case user drags without releasing immediately
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      commitValue(nextVal);
    }, 350);
  };

  const handleRelease = () => {
    if (disabled) return;
    isDraggingRef.current = false;
    commitValue(localValue);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    isDraggingRef.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    handleRelease();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    isDraggingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    let nextVal = localValue;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      nextVal = Math.min(100, localValue + (e.shiftKey ? 10 : 1));
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      nextVal = Math.max(0, localValue - (e.shiftKey ? 10 : 1));
      e.preventDefault();
    } else if (e.key === 'Home') {
      nextVal = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      nextVal = 100;
      e.preventDefault();
    } else {
      return;
    }

    setLocalValue(nextVal);
    commitValue(nextVal);
  };

  return (
    <div
      className={`w-full flex flex-col gap-1.5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={disabled && disabledReason ? disabledReason : undefined}
    >
      <div className="flex items-center justify-between text-xs font-medium">
        <label htmlFor={inputId} className="text-text-muted">
          Brightness
        </label>
        <span className="font-mono text-text tabular-nums">
          {localValue === 0 ? '0% (Off)' : `${localValue}%`}
        </span>
      </div>

      <div className="relative flex items-center w-full min-h-[44px]">
        {/* Visual Track */}
        <div className="absolute inset-x-0 h-2.5 bg-arc-track border border-border-subtle rounded-full pointer-events-none" />
        <input
          id={inputId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={localValue}
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={localValue}
          aria-valuetext={localValue === 0 ? '0 percent (Off)' : `${localValue} percent`}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
          onKeyUp={handleRelease}
          onKeyDown={handleKeyDown}
          className="relative z-10 w-full h-11 py-3 bg-transparent appearance-none cursor-pointer touch-none accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed"
        />
      </div>

      {disabled && disabledReason && (
        <span className="text-[11px] text-text-muted italic" role="note">
          {disabledReason}
        </span>
      )}
    </div>
  );
};
