import React, { forwardRef } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
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
      'aria-disabled': ariaDisabledProp,
      id,
      label,
      description,
      className = '',
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const isAriaDisabled = ariaDisabledProp === true || ariaDisabledProp === 'true';
    const isInactive = disabled || isAriaDisabled;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (isInactive) return;
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
          aria-disabled={isInactive ? true : undefined}
          disabled={disabled && !isAriaDisabled}
          tabIndex={isAriaDisabled ? 0 : undefined}
          onClick={() => !isInactive && onChange(!checked)}
          onKeyDown={handleKeyDown}
          className={`relative inline-flex min-h-[44px] min-w-[48px] items-center justify-center flex-shrink-0 cursor-pointer rounded-full bg-transparent p-1 focus-ring ${
            isInactive ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 ease-in-out pointer-events-none ${
              checked
                ? 'bg-accent border-accent'
                : 'bg-surface-elevated border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
                checked
                  ? 'translate-x-6 bg-white dark:bg-[#0B1012]'
                  : 'translate-x-1 bg-text-muted'
              }`}
            />
          </span>
        </button>
        {(label || description) && (
          <div className="flex flex-col select-none">
            {label && (
              <span
                id={id ? `${id}-label` : undefined}
                className={`text-sm font-medium ${
                  disabled ? 'text-text-muted' : 'text-text'
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
