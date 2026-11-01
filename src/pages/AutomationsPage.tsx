import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

export const AutomationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Automations</h1>
          <p className="text-sm text-text-muted mt-1">
            Build reactive IF/THEN rules, configure recurring schedules, and execute dry runs.
          </p>
        </div>
        <Badge variant="outline">Dry-Run Simulator Enabled</Badge>
      </div>

      <Card padding="lg" className="border-dashed">
        <div className="text-center py-12 space-y-3">
          <h2 className="text-lg font-semibold text-text">Automation Engine & Schedule Builder</h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            This module will deliver edge-triggered rule evaluation, composite AND/OR conditions, loop prevention, persistent schedule editing, and an isolated dry-run sandbox in Task 6.
          </p>
        </div>
      </Card>
    </div>
  );
};

