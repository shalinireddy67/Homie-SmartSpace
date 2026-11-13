import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Moon, Sun, Bell, Home } from 'lucide-react';
import { APP_NAME, APP_SHORT_NAME } from '@/constants/branding';
import { NAV_ITEMS } from '@/constants/navigation';
import { SimulationControls } from './SimulationControls';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';

export interface HeaderProps {
  bannerSlot?: React.ReactNode;
}

const COMPACT_NAV_LABELS: Record<string, string> = {
  '/': 'Overview',
  '/rooms': 'Rooms',
  '/automations': 'Automations',
  '/energy': 'Energy',
  '/history': 'History',
  '/notifications': 'Alerts',
  '/settings': 'Settings',
};

export const Header: React.FC<HeaderProps> = ({ bannerSlot }) => {
  const { theme, toggleTheme } = useTheme();
  const notifications = useStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const timeStr = currentTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const dateStr = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90 sm:rounded-t-[28px]">
      {bannerSlot && (
        <div id="simulation-banner-slot" className="border-b border-border-subtle">
          {bannerSlot}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5 gap-3 min-h-[68px]">
        {/* Left: Minimal Geometric Brand Mark + Home Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-full focus-ring"
            aria-label={APP_NAME}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-text text-surface shadow-xs shrink-0"
              aria-hidden="true"
            >
              {/* Geometric diagonal bars + dot mark matching reference */}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M7 17L12 7M12.5 17L17.5 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="17.5" cy="16.5" r="1.75" fill="currentColor" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-text text-sm sm:text-base whitespace-nowrap">
              <span className="hidden sm:inline">{APP_NAME}</span>
              <span className="sm:hidden">{APP_SHORT_NAME}</span>
            </span>
          </Link>

          <div className="flex flex-col leading-none">
            <span className="hidden xl:inline text-xs text-text-muted font-medium">
              {getGreeting(currentTime)}
            </span>
            <span className="text-[10px] text-text-muted font-medium tabular-nums mt-0.5">
              <span className="hidden sm:inline">{dateStr} • </span>{timeStr}
            </span>
          </div>

          <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text border border-border-subtle select-none">
            <Home className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Lakeview Home</span>
          </div>
        </div>

        {/* Center: Top Horizontal Pill Navigation (Desktop / Tablet md+) */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center justify-center gap-1 order-last xl:order-none w-full xl:w-auto overflow-x-auto py-0.5"
        >
          {NAV_ITEMS.map((item) => {
            const label = COMPACT_NAV_LABELS[item.to] || item.name;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-full text-xs sm:text-[13px] whitespace-nowrap transition-all duration-200 focus-ring ${
                    isActive
                      ? 'bg-accent-subtle text-text font-semibold shadow-xs'
                      : 'text-text-muted font-medium hover:text-text hover:bg-surface-elevated'
                  }`
                }
              >
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Simulation Controls + Bell + Theme Toggle + User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <SimulationControls />

          {/* Notification Bell Circle Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={`Notifications, ${unreadCount} unread`}
            aria-haspopup="dialog"
            aria-expanded={isDrawerOpen}
            className="relative rounded-full p-2 text-text-muted hover:text-text bg-surface-elevated/80 hover:bg-surface-elevated border border-border-subtle transition-colors focus-ring inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px]"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-live="polite"
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white dark:text-[#0B1012] shadow-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="rounded-full p-2 text-text-muted hover:text-text bg-surface-elevated/80 hover:bg-surface-elevated border border-border-subtle min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-accent" aria-hidden="true" />
            )}
          </Button>

          {/* User Profile Chip */}
          <div
            className="hidden sm:flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-surface-elevated/70 border border-border-subtle select-none"
            title="Alex Morgan (Demo)"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-text font-semibold text-xs">
              AM
            </div>
            <span className="hidden lg:inline text-xs font-medium text-text">
              Alex M.
            </span>
          </div>
        </div>
      </div>

      {/* Slide-out Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </header>
  );
};
