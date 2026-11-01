import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Notifications</h1>
          <p className="text-sm text-text-muted mt-1">
            Persistent alert center with unread badges, deduplication, and severity categorization.
          </p>
        </div>
        <Badge variant="accent">Persistent Hub</Badge>
      </div>

      <Card padding="lg" className="border-dashed">
        <div className="text-center py-12 space-y-3">
          <h2 className="text-lg font-semibold text-text">Notification Center Ready</h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            This module will deliver unread counts, mark-all-read actions, severity filtering, alert deduplication cooldowns, and real-time toast integrations in Task 7.
          </p>
        </div>
      </Card>
    </div>
  );
};

