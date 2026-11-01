import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

export const EventHistoryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Event History</h1>
          <p className="text-sm text-text-muted mt-1">
            Search, filter, and inspect over 10,000 simulated audit logs and telemetry events.
          </p>
        </div>
        <Badge variant="outline">TanStack Virtual 60 FPS</Badge>
      </div>

      <Card padding="lg" className="border-dashed">
        <div className="text-center py-12 space-y-3">
          <h2 className="text-lg font-semibold text-text">Virtualized Audit Trail Ready</h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            This module will deliver virtualized infinite scrolling of 10,000+ seeded events, multi-faceted filtering, sorting, and an inspector details panel in Task 7.
          </p>
        </div>
      </Card>
    </div>
  );
};

