import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

export const RoomsDevicesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Rooms & Devices</h1>
          <p className="text-sm text-text-muted mt-1">
            Browse and manage connected lights, thermostats, locks, and cameras across 5 rooms.
          </p>
        </div>
        <Badge variant="accent">5 Rooms Configured</Badge>
      </div>

      <Card padding="lg" className="border-dashed">
        <div className="text-center py-12 space-y-3">
          <h2 className="text-lg font-semibold text-text">Rooms & Device Grid Ready for Controls</h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            This module will feature room filtering (Living Room, Bedroom, Kitchen, Bathroom, Outdoor), light dimmers/RGB pickers, the accessible radial thermostat dial, smart lock confirmations, and offline status reason badges in Task 3.
          </p>
        </div>
      </Card>
    </div>
  );
};

