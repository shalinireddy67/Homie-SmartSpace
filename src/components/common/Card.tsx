import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = 'md',
      bordered = true,
      hoverable = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`bg-surface-card text-text rounded-xl shadow-sm transition-all duration-200 ${
          bordered ? 'border border-border' : ''
        } ${hoverable ? 'hover:shadow-md hover:border-border/80' : ''} ${
          paddingStyles[padding]
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

