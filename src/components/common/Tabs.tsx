import React, { useRef } from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'pill' | 'underline';
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  variant = 'pill',
  ariaLabel,
  className = '',
}: TabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % items.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = items.length - 1;
    } else {
      return;
    }

    const nextTab = items[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={
        variant === 'underline'
          ? `flex items-center gap-4 border-b border-border-subtle overflow-x-auto ${className}`
          : `flex items-center gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-1 ${className}`
      }
    >
      {items.map((item, index) => {
        const isSelected = item.id === value;

        if (variant === 'underline') {
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`relative pb-2.5 pt-2 px-1 text-xs sm:text-sm whitespace-nowrap transition-colors focus-ring min-h-[44px] lg:min-h-[38px] inline-flex items-center gap-1.5 ${
                isSelected
                  ? 'font-semibold text-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-text'
                  : 'font-medium text-text-muted hover:text-text'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="text-[11px] font-mono tabular-nums opacity-75">
                  ({item.badge})
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-3.5 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition-all duration-200 inline-flex items-center gap-2 focus-ring min-h-[44px] lg:min-h-[36px] shrink-0 ${
              isSelected
                ? 'bg-surface text-text font-semibold shadow-xs border border-border'
                : 'bg-surface/70 text-text-muted font-medium border border-border-subtle hover:text-text hover:bg-surface'
            }`}
          >
            {item.icon && (
              <span
                className={`h-6 w-6 rounded-full inline-flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-accent-subtle text-text'
                    : 'bg-surface-elevated text-text-muted'
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-surface-elevated text-text-muted">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
