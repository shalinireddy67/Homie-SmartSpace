import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from '@/constants/navigation';
import { MoreHorizontal, X } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 4 primary items for bottom bar
  const primaryItems = BOTTOM_NAV_ITEMS.slice(0, 4);

  return (
    <>
      {/* Mobile Menu Sheet for All Pages */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-surface border-t border-border rounded-t-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="font-semibold text-text text-base">All Navigation</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl text-text-muted hover:text-text focus-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-2xl text-sm font-medium transition-colors min-h-[48px] ${
                        isActive
                          ? 'bg-surface-elevated text-accent font-semibold'
                          : 'text-text hover:bg-surface-elevated/50'
                      }`
                    }
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-elevated text-accent">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-border px-2 py-1 flex items-center justify-around safe-area-pb"
        aria-label="Mobile Navigation"
      >
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors focus-ring select-none min-w-[48px] min-h-[44px] ${
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-text-muted hover:text-text'
                }`
              }
            >
              <Icon className="h-5 w-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-[56px] text-center">{item.name}</span>
            </NavLink>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium text-text-muted hover:text-text focus-ring select-none min-w-[48px] min-h-[44px]"
          aria-label="Open full navigation menu"
        >
          <MoreHorizontal className="h-5 w-5 mb-0.5" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
