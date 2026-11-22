import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '@/constants/navigation';
import { AppRoutes } from '@/App';
import { setSession, clearSession } from '@/services/session';

describe('Navigation components', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    // Establish demo session so protected /app routes and legacy redirects render in tests
    setSession({ mode: 'demo', startedAt: Date.now() });
  });

  it('renders all 7 navigation links in the Sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(NAV_ITEMS).toHaveLength(7);

    // Verify all 7 route names exist
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Rooms & Devices')).toBeInTheDocument();
    expect(screen.getByText('Automations')).toBeInTheDocument();
    expect(screen.getByText('Energy Analytics')).toBeInTheDocument();
    expect(screen.getByText('Event History')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders all 7 navigation items in mobile BottomNav', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(BOTTOM_NAV_ITEMS).toHaveLength(7);
  });

  it('renders Landing page at public root path', async () => {
    clearSession();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Modern Smart Home Control/i })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('renders Overview page at /app for authenticated session', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Overview/i })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('navigates to Rooms & Devices page at /rooms via legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/rooms']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Rooms & Devices' })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('navigates to Automations page at /automations via legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/automations']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Automations' })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('navigates to Energy Analytics page at /energy via legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/energy']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Energy Analytics' })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('navigates to Event History page at /history via legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/history']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Event History' })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('navigates to Notifications page at /notifications via legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('navigates to Settings page at /settings via legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    }, { timeout: 20000 });
  });
});
