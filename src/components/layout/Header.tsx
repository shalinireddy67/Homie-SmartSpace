import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/common/Button';
import { Moon, Sun, Shield } from 'lucide-react';
import { APP_NAME } from '@/constants/branding';
import { SimulationControls } from './SimulationControls';

export interface HeaderProps {
  bannerSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ bannerSlot }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      {/* Simulation Controls Slot */}
      <div id="simulation-banner-slot">
        {bannerSlot !== undefined ? bannerSlot : <SimulationControls />}
      </div>

      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile Logo Mark */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-text text-lg">
              {APP_NAME}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Simulator Engine Active</span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="rounded-lg p-2 text-text-muted hover:text-text hover:bg-surface-subtle"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-accent" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

