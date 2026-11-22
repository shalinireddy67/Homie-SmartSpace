import React, { forwardRef } from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-ring rounded-2xl select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

    const sizeStyles = {
      sm: 'px-3.5 py-2 text-xs gap-1.5 min-h-[44px] lg:min-h-[36px]',
      md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
      lg: 'px-5 py-3 text-base gap-2.5 min-h-[48px]',
    };

    const variantStyles = {
      primary:
        'bg-accent text-white dark:text-[#0B1012] hover:bg-accent-hover shadow-xs active:translate-y-px',
      secondary:
        'bg-surface-elevated text-text hover:bg-accent-subtle/60 border border-border-subtle shadow-xs',
      outline:
        'bg-surface text-text border border-border hover:bg-surface-elevated hover:border-accent',
      ghost:
        'bg-transparent text-text-muted hover:text-text hover:bg-surface-elevated',
      danger:
        'bg-danger text-white dark:text-[#0B1012] hover:bg-danger/90 shadow-xs active:translate-y-px',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? true : undefined}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
