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
    | 'green';
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
    default: 'bg-surface-elevated text-text-muted border border-border/80',
    success: 'bg-success/15 text-success border border-success/30 font-medium',
    warning: 'bg-warning/15 text-warning border border-warning/30 font-medium',
    danger: 'bg-danger/15 text-danger border border-danger/30 font-medium',
    accent: 'bg-accent/15 text-accent border border-accent/30 font-medium',
    outline: 'bg-transparent text-text-muted border border-border font-medium',
    blue: 'bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/20 font-medium',
    yellow: 'bg-pastel-yellow-bg text-pastel-yellow-text border border-pastel-yellow-text/20 font-medium',
    green: 'bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/20 font-medium',
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
