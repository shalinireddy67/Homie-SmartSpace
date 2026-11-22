import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightElement, error = false, className = '', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span
            className="absolute left-3.5 text-text-muted pointer-events-none inline-flex items-center"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={`w-full min-h-[44px] text-base sm:text-sm bg-surface text-text placeholder:text-text-muted rounded-2xl border transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-danger' : 'border-border hover:border-accent/60'
          } ${leftIcon ? 'pl-10' : 'px-3.5'} ${rightElement ? 'pr-10' : 'pr-3.5'} py-2 ${className}`}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-2.5 inline-flex items-center">
            {rightElement}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

