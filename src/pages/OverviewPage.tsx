import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Activity, ShieldCheck, Zap, Thermometer } from 'lucide-react';

export const OverviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Overview</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time telemetry, active alerts, and whole-home status monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">All Systems Normal</Badge>
          <Badge variant="outline">Simulated Telemetry</Badge>
        </div>
      </div>

      {/* Metric Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Power Usage</p>
            <p className="text-xl font-bold text-text mt-0.5">1,240 W</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10 text-success">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Active Devices</p>
            <p className="text-xl font-bold text-text mt-0.5">14 / 15 Online</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Avg Temperature</p>
            <p className="text-xl font-bold text-text mt-0.5">21.8 °C</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Security State</p>
            <p className="text-xl font-bold text-text mt-0.5">Armed (Home)</p>
          </div>
        </Card>
      </div>

      <Card padding="lg" className="border-dashed">
        <div className="text-center py-10 space-y-3">
          <h2 className="text-lg font-semibold text-text">Overview Dashboard Ready for Telemetry Engine</h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            This module will connect to the central simulation engine in Task 4, showcasing real-time sensor updates, room overviews, and quick action tiles.
          </p>
        </div>
      </Card>
    </div>
  );
};

