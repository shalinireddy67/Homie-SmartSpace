import React from 'react';
import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS } from '@/constants/navigation';

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-border px-1 py-1.5 flex items-center justify-around safe-area-pb"
      aria-label="Mobile Navigation"
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-[10px] font-medium transition-colors focus-ring select-none min-w-[44px] ${
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-text-muted hover:text-text'
              }`
            }
          >
            <Icon className="h-5 w-5 mb-0.5" aria-hidden="true" />
            <span className="truncate max-w-[48px] text-center">{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
