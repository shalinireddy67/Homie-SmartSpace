import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useTheme } from '@/hooks/useTheme';
import { Switch } from '@/components/common/Switch';
import { Moon, Sun } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            System preferences, theme appearance, simulation controls, and debugging options.
          </p>
        </div>
        <Badge variant="outline">Client Configuration</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-warning" />}
            Appearance & Theme
          </h2>
          <p className="text-sm text-text-muted">
            Configure application appearance. Preferences are persisted locally and prevent theme flash on initial load.
          </p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-text">Dark Mode</span>
            <Switch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              aria-label="Toggle dark mode theme"
            />
          </div>
        </Card>

        <Card className="space-y-4 border-dashed">
          <h2 className="text-base font-semibold text-text">Simulation Debug & Persistence</h2>
          <p className="text-sm text-text-muted">
            Controls for the virtual simulation engine, injectable clock, &quot;Fail Next Command&quot; debug toggle, and storage reset will be populated here.
          </p>
          <div className="pt-2">
            <Badge variant="outline">Ready for Task 4 Engine Integration</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};

