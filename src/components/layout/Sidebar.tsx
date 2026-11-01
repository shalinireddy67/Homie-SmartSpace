import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/constants/branding';
import { NAV_ITEMS } from '@/constants/navigation';

export const Sidebar: React.FC = () => {
  return (
    <aside
      className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0 h-screen sticky top-0"
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold tracking-tight text-text text-lg leading-tight truncate">
            {APP_NAME}
          </span>
          <span className="text-[11px] text-text-muted truncate font-medium">
            {APP_TAGLINE}
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main menu">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-ring select-none ${
                  isActive
                    ? 'bg-accent/10 text-accent font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text hover:bg-surface-subtle'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border/80">
        <div className="px-3 py-2.5 rounded-xl bg-surface-subtle border border-border/60">
          <p className="text-xs font-medium text-text">Simulation Engine</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Running 100% Client-Side
          </p>
        </div>
      </div>
    </aside>
  );
};
