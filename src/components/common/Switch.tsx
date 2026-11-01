import React, { forwardRef } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  description?: string;
  className?: string;
  'aria-label'?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onChange,
      disabled = false,
      id,
      label,
      description,
      className = '',
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChange(!checked);
      }
    };

    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <button
          ref={ref}
          type="button"
          role="switch"
          id={id}
          aria-checked={checked}
          aria-label={ariaLabel || label}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          onKeyDown={handleKeyDown}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-ring ${
            checked ? 'bg-accent' : 'bg-surface-elevated border-border'
          } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span
                id={id ? `${id}-label` : undefined}
                className={`text-sm font-medium ${
                  disabled ? 'text-text-muted/60' : 'text-text'
                }`}
              >
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-text-muted">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

