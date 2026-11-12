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
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800/50 font-medium',
    warning: 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800/50 font-medium',
    danger: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-200 dark:border-red-800/50 font-medium',
    accent: 'bg-accent-subtle/70 text-[#145246] dark:text-[#A7F3D0] border border-accent/30 font-medium',
    outline: 'bg-transparent text-text border border-border font-medium',
    blue: 'bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/20 font-medium',
    yellow: 'bg-pastel-yellow-bg text-pastel-yellow-text border border-pastel-yellow-text/20 font-medium',
    green: 'bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/20 font-medium',
    peach: 'bg-pastel-peach-bg text-pastel-peach-text border border-pastel-peach-text/20 font-medium',
    lavender: 'bg-pastel-lavender-bg text-pastel-lavender-text border border-pastel-lavender-text/20 font-medium',
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
