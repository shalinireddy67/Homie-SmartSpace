import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { RoomsDevicesPage } from '@/pages/RoomsDevicesPage';
import { AutomationsPage } from '@/pages/AutomationsPage';
import { EnergyAnalyticsPage } from '@/pages/EnergyAnalyticsPage';
import { EventHistoryPage } from '@/pages/EventHistoryPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/rooms" element={<RoomsDevicesPage />} />
      <Route path="/automations" element={<AutomationsPage />} />
      <Route path="/energy" element={<EnergyAnalyticsPage />} />
      <Route path="/history" element={<EventHistoryPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
};

export default App;

