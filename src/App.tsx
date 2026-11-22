import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouteSeo } from '@/hooks/useRouteSeo';

const OverviewPage = lazy(() =>
  import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const RoomsDevicesPage = lazy(() =>
  import('@/pages/RoomsDevicesPage').then((m) => ({ default: m.RoomsDevicesPage }))
);
const AutomationsPage = lazy(() =>
  import('@/pages/AutomationsPage').then((m) => ({ default: m.AutomationsPage }))
);
const EnergyAnalyticsPage = lazy(() =>
  import('@/pages/EnergyAnalyticsPage').then((m) => ({ default: m.EnergyAnalyticsPage }))
);
const EventHistoryPage = lazy(() =>
  import('@/pages/EventHistoryPage').then((m) => ({ default: m.EventHistoryPage }))
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div
    role="status"
    aria-label="Loading page content"
    className="w-full py-16 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200"
  >
    <div className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    <span className="text-xs text-text-muted font-medium">Loading content...</span>
  </div>
);

export const AppRoutes: React.FC = () => {
  useRouteSeo();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <OverviewPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/rooms"
          element={
            <ErrorBoundary>
              <RoomsDevicesPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/automations"
          element={
            <ErrorBoundary>
              <AutomationsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/energy"
          element={
            <ErrorBoundary>
              <EnergyAnalyticsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/history"
          element={
            <ErrorBoundary>
              <EventHistoryPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/notifications"
          element={
            <ErrorBoundary>
              <NotificationsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/settings"
          element={
            <ErrorBoundary>
              <SettingsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="*"
          element={
            <ErrorBoundary>
              <NotFoundPage />
            </ErrorBoundary>
          }
        />
      </Routes>
    </Suspense>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;

