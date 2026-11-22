import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'accent'
    | 'outline'
    | 'blue'
    | 'yellow'
    | 'green'
    | 'peach'
    | 'lavender';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-medium leading-none',
    md: 'px-3 py-1 text-xs font-medium leading-tight',
  };

  const variantStyles = {
    default: 'bg-surface-elevated text-text-muted border border-border-subtle',
    success: 'bg-success/15 text-success border border-success/30 font-medium',
    warning: 'bg-warning/15 text-warning border border-warning/30 font-medium',
    danger: 'bg-danger/15 text-danger border border-danger/30 font-medium',
    accent: 'bg-accent/15 text-accent border border-accent/30 font-medium',
    outline: 'bg-transparent text-text border border-border font-medium',
    blue: 'bg-surface-elevated text-text border border-border-subtle font-medium',
    yellow: 'bg-surface-elevated text-text border border-border-subtle font-medium',
    green: 'bg-surface-elevated text-text border border-border-subtle font-medium',
    peach: 'bg-surface-elevated text-text border border-border-subtle font-medium',
    lavender: 'bg-surface-elevated text-text border border-border-subtle font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full select-none whitespace-nowrap shrink-0 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
