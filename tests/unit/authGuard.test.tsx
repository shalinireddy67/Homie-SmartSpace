import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import { setSession, clearSession } from '@/services/session';
import { initializeStore, useStore } from '@/store';
import type { Notification } from '@/types';

describe('Auth Guard & Routing Hierarchy', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    initializeStore(1730476800000);
  });

  it('redirects unauthenticated visitors from /app to /login with encoded returnTo query', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sign in to Homie SmartSpace/i })).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated visitors from nested /app/rooms to /login preserving target', async () => {
    render(
      <MemoryRouter initialEntries={['/app/rooms']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sign in to Homie SmartSpace/i })).toBeInTheDocument();
    });
  });

  it('allows access to /app when an active demo session exists', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Overview/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('preserves query string and hash when executing legacy redirect from /rooms', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    render(
      <MemoryRouter initialEntries={['/rooms?device=dev-light-living#controls']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Rooms & Devices/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('redirects legacy /energy path to /app/energy', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    render(
      <MemoryRouter initialEntries={['/energy']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Energy Analytics/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('redirects legacy /history path to /app/events', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    render(
      <MemoryRouter initialEntries={['/history']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Event History/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('redirects /app/history to /app/events', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    render(
      <MemoryRouter initialEntries={['/app/history']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Event History/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders NotFoundPage inside AppShell when visiting an unknown subroute under /app/*', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    render(
      <MemoryRouter initialEntries={['/app/unknown-subroute']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Page Not Found/i })).toBeInTheDocument();
        // Since session is active, the button directs back to dashboard
        expect(screen.getByRole('button', { name: /Back to dashboard/i })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('loads persisted notifications containing legacy paths /rooms, /energy, /history and opens them successfully', async () => {
    setSession({ mode: 'demo', startedAt: Date.now() });

    const legacyNotifs: Notification[] = [
      {
        id: 'legacy-1',
        timestamp: 1730476800000,
        title: 'Legacy Room Alert',
        message: 'Thermostat offline in kitchen',
        severity: 'warning',
        read: false,
        category: 'device',
        link: '/rooms?device=dev-thermostat-kitchen',
      },
      {
        id: 'legacy-2',
        timestamp: 1730476700000,
        title: 'Legacy Energy Surge',
        message: 'Spike detected',
        severity: 'danger',
        read: false,
        category: 'energy',
        link: '/energy',
      },
      {
        id: 'legacy-3',
        timestamp: 1730476600000,
        title: 'Legacy Audit Notice',
        message: 'Door unlock failed',
        severity: 'info',
        read: true,
        category: 'security',
        link: '/history',
      },
    ];

    useStore.getState().setNotifications(legacyNotifs);

    render(
      <MemoryRouter initialEntries={['/app/notifications']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1, name: /Notifications/i })).toBeInTheDocument();
        expect(screen.getByText('Legacy Room Alert')).toBeInTheDocument();
        expect(screen.getByText('Legacy Energy Surge')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
