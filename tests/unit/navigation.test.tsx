import { describe, it, expect } from 'vitest';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '@/constants/navigation';
import { AppRoutes } from '@/App';

describe('Navigation components', () => {
  it('renders all 7 navigation links in the Sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
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
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(BOTTOM_NAV_ITEMS).toHaveLength(7);
  });

  it('renders Overview page by default at root path', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: /Overview/i })).toBeInTheDocument();
  });

  it('navigates to Rooms & Devices page at /rooms', async () => {
    render(
      <MemoryRouter initialEntries={['/rooms']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Rooms & Devices' })).toBeInTheDocument();
  });

  it('navigates to Automations page at /automations', async () => {
    render(
      <MemoryRouter initialEntries={['/automations']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Automations' })).toBeInTheDocument();
  });

  it('navigates to Energy Analytics page at /energy', async () => {
    render(
      <MemoryRouter initialEntries={['/energy']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Energy Analytics' })).toBeInTheDocument();
  });

  it('navigates to Event History page at /history', async () => {
    render(
      <MemoryRouter initialEntries={['/history']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Event History' })).toBeInTheDocument();
  });

  it('navigates to Notifications page at /notifications', async () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
  });

  it('navigates to Settings page at /settings', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading page content'), { timeout: 10000 });
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });
});
