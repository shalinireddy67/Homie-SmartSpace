import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/constants/branding';
import { NAV_ITEMS } from '@/constants/navigation';
import { Badge } from '@/components/common/Badge';

export const Sidebar: React.FC = () => {
  return (
    <aside
      className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0 h-screen sticky top-0"
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border/80">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white shadow-xs">
          <Shield className="h-5 w-5" aria-hidden="true" />
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
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="Main menu">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-ring select-none min-h-[44px] ${
                  isActive
                    ? 'bg-surface-elevated text-text font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text hover:bg-surface-elevated/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Non-color active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-accent' : 'text-text-muted group-hover:text-text'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Block at Bottom */}
      <div className="p-4 border-t border-border/80 bg-surface">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-surface-elevated/60 border border-border/60">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-xs border border-accent/20"
            aria-hidden="true"
          >
            AM
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-text truncate">Alex Morgan</span>
              <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1.5">
                Demo
              </Badge>
            </div>
            <span className="text-[11px] text-text-muted truncate">alex@lakeview.home</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
