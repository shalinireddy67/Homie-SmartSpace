import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

export const EnergyAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Energy Analytics</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time power draw, historical consumption, and rolling-baseline anomaly detection.
          </p>
        </div>
        <Badge variant="accent">Live Anomaly Engine Ready</Badge>
      </div>

      <Card padding="lg" className="border-dashed">
        <div className="text-center py-12 space-y-3">
          <h2 className="text-lg font-semibold text-text">Energy Telemetry & Theme-Aware Charts</h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            This module will feature interactive Recharts visualizations (1h, 24h, 7d, 30d, custom), room/device breakdowns, and highlighted rolling-baseline spike detection markers in Task 5.
          </p>
        </div>
      </Card>
    </div>
  );
};

