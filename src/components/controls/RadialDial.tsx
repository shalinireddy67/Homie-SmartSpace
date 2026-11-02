import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface RadialDialProps {
  current: number; // Current temperature reading
  target: number; // Target thermostat setting
  min?: number; // Minimum target limit (default 16)
  max?: number; // Maximum target limit (default 30)
  unit?: string; // Temperature unit (default 'C')
  onCommit: (newTarget: number) => void;
  disabled?: boolean;
  disabledReason?: string;
  rejectedFeedback?: string;
}

export const RadialDial: React.FC<RadialDialProps> = ({
  current,
  target,
  min = 16,
  max = 30,
  unit = 'C',
  onCommit,
  disabled = false,
  disabledReason,
  rejectedFeedback,
}) => {
  const [localTarget, setLocalTarget] = useState<number>(target);
  const isDraggingRef = useRef(false);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalTarget(target);
    }
  }, [target]);

  const commitTarget = useCallback(
    (newVal: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      onCommit(newVal);
    },
    [onCommit]
  );

  // Geometry calculations
  const size = 180;
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const startAngle = -135; // degrees from top
  const endAngle = 135;
  const totalAngle = endAngle - startAngle; // 270 degrees

  // Angle to coordinates
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  // SVG Arc Path description
  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const targetFraction = Math.max(0, Math.min(1, (localTarget - min) / (max - min)));
  const targetAngle = startAngle + targetFraction * totalAngle;

  const currentFraction = Math.max(0, Math.min(1, (current - min) / (max - min)));
  const currentAngle = startAngle + currentFraction * totalAngle;

  const trackPath = describeArc(center, center, radius, startAngle, endAngle);
  const activePath = describeArc(center, center, radius, startAngle, targetAngle);

  const targetPos = polarToCartesian(center, center, radius, targetAngle);
  const currentPos = polarToCartesian(center, center, radius - 8, currentAngle);

  // Pointer drag to angle conversion
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || disabled || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;

    // Angle in degrees clockwise from bottom (where gap is)
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    // Normalizing relative to 270 degree arc centered at top
    // 0 is top (0 deg). Left gap is -135 to -180, right gap is +135 to +180.
    let relAngle = deg > 180 ? deg - 360 : deg;
    if (relAngle < startAngle) relAngle = startAngle;
    if (relAngle > endAngle) relAngle = endAngle;

    const fraction = (relAngle - startAngle) / totalAngle;
    const rawVal = min + fraction * (max - min);
    // Snap to 0.5 degrees
    const snapped = Math.round(rawVal * 2) / 2;
    const clamped = Math.max(min, Math.min(max, snapped));

    setLocalTarget(clamped);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      commitTarget(clamped);
    }, 300);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    isDraggingRef.current = true;
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    if (disabled) return;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      commitTarget(localTarget);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    let next = localTarget;

    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      next = Math.min(max, localTarget + 0.5);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      next = Math.max(min, localTarget - 0.5);
      e.preventDefault();
    } else if (e.key === 'Home') {
      next = min;
      e.preventDefault();
    } else if (e.key === 'End') {
      next = max;
      e.preventDefault();
    } else {
      return;
    }

    setLocalTarget(next);
    commitTarget(next);
  };

  // Operational mode label
  const isHeating = localTarget > current + 0.2;
  const isCooling = localTarget < current - 0.2;
  const modeLabel = isHeating ? 'Heating' : isCooling ? 'Cooling' : 'Idle';
  const modeColor = isHeating
    ? 'text-warning bg-warning/10 border-warning/30'
    : isCooling
    ? 'text-accent bg-accent/10 border-accent/30'
    : 'text-text-muted bg-surface-subtle border-border';

  return (
    <div
      className={`flex flex-col items-center select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={disabled && disabledReason ? disabledReason : undefined}
    >
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label="Thermostat target temperature"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localTarget}
        aria-valuetext={`${localTarget}°${unit}`}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative touch-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full p-1"
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {/* Background Track Arc */}
          <path
            d={trackPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="text-surface-subtle"
          />

          {/* Active Target Arc */}
          <path
            d={activePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={isHeating ? 'text-warning' : isCooling ? 'text-accent' : 'text-success'}
          />

          {/* Current Ambient Temperature Dot Indicator */}
          <circle
            cx={currentPos.x}
            cy={currentPos.y}
            r={4}
            className="fill-text-muted"
            aria-hidden="true"
          />

          {/* Target Handle Dot */}
          <circle
            cx={targetPos.x}
            cy={targetPos.y}
            r={strokeWidth / 1.1}
            className={`fill-white stroke-2 shadow-md transition-transform ${
              isHeating ? 'stroke-warning' : isCooling ? 'stroke-accent' : 'stroke-success'
            }`}
            aria-hidden="true"
          />
        </svg>

        {/* Center Readouts */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
          <span className="text-xs text-text-muted font-medium">Target</span>
          <span className="text-3xl font-bold tracking-tight text-text">
            {localTarget.toFixed(1)}°
          </span>
          <span className="text-[11px] text-text-muted mt-0.5">
            Current: {current.toFixed(1)}°{unit}
          </span>
        </div>
      </div>

      {/* Mode Status Badge */}
      <div className={`mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${modeColor}`}>
        {modeLabel}
      </div>

      {/* Rejected Value Feedback */}
      {rejectedFeedback && (
        <span className="mt-1 text-xs text-danger font-medium text-center" role="alert">
          {rejectedFeedback}
        </span>
      )}

      {disabled && disabledReason && (
        <span className="mt-1 text-[11px] text-text-muted italic text-center" role="note">
          {disabledReason}
        </span>
      )}
    </div>
  );
};
