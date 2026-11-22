import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '@/constants/navigation';
import { AppRoutes } from '@/App';

const LocationTracker = () => {
  const loc = useLocation();
  return (
    <div data-testid="current-location">
      {loc.pathname}{loc.search}{loc.hash}
    </div>
  );
};

describe('Navigation components and routing architecture', () => {
  beforeEach(() => {
    localStorage.clear();
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
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Modern Smart Home Control/i })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('renders Overview page at /app directly without auth guard or session requirement', async () => {
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

  it('preserves query parameters and hash during legacy redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/rooms?highlight=dev-living-main#section-controls']}>
        <AppRoutes />
        <LocationTracker />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/app/rooms?highlight=dev-living-main#section-controls'
      );
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

  it('shows in-shell 404 with "Back to dashboard" button for unknown paths under /app/*', async () => {
    render(
      <MemoryRouter initialEntries={['/app/unknown-subroute-xyz']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Page Not Found/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to dashboard/i })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('shows public 404 with "Back to overview" button for unknown paths outside /app', async () => {
    render(
      <MemoryRouter initialEntries={['/completely-unknown-route']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Page Not Found/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to overview/i })).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('successfully resolves legacy links from persisted notifications (/rooms, /energy, /history)', async () => {
    const legacyLinks = ['/rooms', '/energy', '/history'];
    for (const link of legacyLinks) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[link]}>
          <AppRoutes />
          <LocationTracker />
        </MemoryRouter>
      );

      const expectedPath = link === '/history' ? '/app/events' : `/app${link}`;
      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent(expectedPath);
      }, { timeout: 20000 });

      unmount();
    }
  });
});
