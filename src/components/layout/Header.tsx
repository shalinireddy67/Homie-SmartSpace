import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';
import { Moon, Sun, Bell, Home, ChevronDown, Shield } from 'lucide-react';
import { APP_NAME } from '@/constants/branding';
import { SimulationControls } from './SimulationControls';

export interface HeaderProps {
  bannerSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ bannerSlot }) => {
  const { theme, toggleTheme } = useTheme();
  const notifications = useStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const hour = currentTime.getHours();
  let greeting = 'Good evening';
  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Good afternoon';
  }

  const dateStr = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = currentTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      {bannerSlot && (
        <div id="simulation-banner-slot" className="border-b border-border/70">
          {bannerSlot}
        </div>
      )}

      <div className="flex h-16 items-center justify-between px-4 sm:px-6 gap-3">
        {/* Left Side: Mobile Logo & Greeting + Clock */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 md:hidden shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white shadow-xs">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-bold tracking-tight text-text text-base">
              {APP_NAME}
            </span>
          </div>

          {/* Greeting & Time (Desktop / Tablet) */}
          <div className="hidden sm:flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-text truncate">
                {greeting}, Alex
              </h1>
            </div>
            <span className="text-[11px] text-text-muted font-medium tabular-nums truncate">
              {dateStr} • {timeStr}
            </span>
          </div>

          {/* Static Home Selector */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface-elevated/70 text-xs font-medium text-text border border-border/70 select-none">
            <Home className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Lakeview Home</span>
            <ChevronDown className="h-3 w-3 text-text-muted" aria-hidden="true" />
          </div>
        </div>

        {/* Center/Right Slot: Compact Simulation Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <SimulationControls />

          {/* Notification Bell */}
          <Link
            to="/notifications"
            aria-label={`Notifications, ${unreadCount} unread`}
            className="relative rounded-xl p-2 text-text-muted hover:text-text hover:bg-surface-elevated transition-colors focus-ring inline-flex items-center justify-center min-w-[40px] min-h-[40px]"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-live="polite"
                className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="rounded-xl p-2 text-text-muted hover:text-text hover:bg-surface-elevated min-w-[40px] min-h-[40px]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-accent" aria-hidden="true" />
            )}
          </Button>

          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-xs border border-accent/20 select-none"
            title="Alex Morgan (Demo)"
            aria-hidden="true"
          >
            AM
          </div>
        </div>
      </div>
    </header>
  );
};
