import React, { useState, useEffect, useId } from 'react';

export interface ColorPickerProps {
  value: string; // Hex color e.g. '#ffffff'
  onCommit: (newColor: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const PRESET_COLORS = [
  '#FFFFFF', // Pure White
  '#FFEDD5', // Warm Amber Glow
  '#FED7AA', // Soft Sunset
  '#FDE047', // Daylight Yellow
  '#86EFAC', // Emerald Green
  '#93C5FD', // Ocean Blue
  '#C084FC', // Violet
  '#F43F5E', // Rose Accent
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onCommit,
  disabled = false,
  disabledReason,
}) => {
  const hexInputId = useId();
  const [hexInput, setHexInput] = useState<string>(value);
  const [inputError, setInputError] = useState<boolean>(false);

  useEffect(() => {
    setHexInput(value);
    setInputError(false);
  }, [value]);

  const normalizeHex = (raw: string): string | null => {
    let clean = raw.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      return clean.toUpperCase();
    }
    return null;
  };

  const handleSwatchClick = (color: string) => {
    if (disabled) return;
    setHexInput(color);
    setInputError(false);
    onCommit(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const val = e.target.value;
    setHexInput(val);
    const valid = normalizeHex(val);
    setInputError(!valid && val.length > 0);
  };

  const handleInputBlur = () => {
    if (disabled) return;
    const valid = normalizeHex(hexInput);
    if (valid) {
      setHexInput(valid);
      setInputError(false);
      if (valid !== value.toUpperCase()) {
        onCommit(valid);
      }
    } else {
      // Revert to valid prop value
      setHexInput(value);
      setInputError(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div
      className={`flex flex-col gap-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={disabled && disabledReason ? disabledReason : undefined}
    >
      <div className="flex items-center justify-between text-xs font-medium text-text-muted">
        <span>Color</span>
        <div className="flex items-center gap-1.5 font-mono text-text">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-border shadow-xs"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
          <span className="uppercase text-[11px]">{value}</span>
        </div>
      </div>

      {/* Preset Swatches */}
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Preset light colors">
        {PRESET_COLORS.map((swatch) => {
          const isSelected = value.toUpperCase() === swatch.toUpperCase();
          return (
            <button
              key={swatch}
              type="button"
              disabled={disabled}
              aria-disabled={disabled}
              aria-label={`Color ${swatch}`}
              aria-pressed={isSelected}
              onClick={() => handleSwatchClick(swatch)}
              className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                disabled ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <span
                className={`h-7 w-7 sm:h-6 sm:w-6 rounded-full border transition-transform pointer-events-none ${
                  isSelected
                    ? 'border-accent scale-110 ring-2 ring-accent/30'
                    : 'border-border hover:scale-105'
                }`}
                style={{ backgroundColor: swatch }}
              />
            </button>
          );
        })}
      </div>

      {/* Hex Text Input */}
      <div className="flex items-center gap-2 mt-1">
        <label htmlFor={hexInputId} className="text-[11px] text-text-muted">
          Hex:
        </label>
        <input
          id={hexInputId}
          type="text"
          value={hexInput}
          disabled={disabled}
          readOnly={disabled}
          aria-disabled={disabled}
          aria-label="Hex color code"
          maxLength={7}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`w-28 px-2.5 py-1.5 min-h-[44px] text-base sm:text-xs font-mono uppercase bg-surface rounded-xl border ${
            inputError ? 'border-danger focus:ring-danger' : 'border-border focus:ring-accent'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''} focus-visible:outline-none focus-visible:ring-2`}
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
