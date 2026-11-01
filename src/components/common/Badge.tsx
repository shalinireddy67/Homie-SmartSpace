import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'outline';
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
    sm: 'px-2 py-0.5 text-[11px] font-medium leading-none',
    md: 'px-2.5 py-1 text-xs font-medium leading-tight',
  };

  const variantStyles = {
    default: 'bg-surface-elevated text-text-muted border border-border/80',
    success: 'bg-success/15 text-success border border-success/30',
    warning: 'bg-warning/15 text-warning border border-warning/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    accent: 'bg-accent/15 text-accent border border-accent/30',
    outline: 'bg-transparent text-text-muted border border-border',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

