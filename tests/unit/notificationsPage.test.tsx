import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { useStore, initializeStore } from '@/store';
import type { Notification } from '@/types';

const testNotifications: Notification[] = [
  {
    id: 'notif-1',
    timestamp: 1730476800000,
    title: 'AC Unit Offline',
    message: 'Ping timeout detected in Living Room',
    severity: 'warning',
    read: false,
    category: 'device',
    link: '/rooms',
  },
  {
    id: 'notif-2',
    timestamp: 1730476700000,
    title: 'High Power Spike',
    message: 'Surge over 3000W recorded',
    severity: 'danger',
    read: false,
    category: 'energy',
    link: '/energy',
  },
  {
    id: 'notif-3',
    timestamp: 1730476600000,
    title: 'Firmware Updated',
    message: 'Smart Lock updated to v2.4.1',
    severity: 'success',
    read: true,
    category: 'system',
  },
];

describe('NotificationsPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    initializeStore(1730476800000);
    useStore.getState().setNotifications(testNotifications);
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

  it('renders notifications header with unread badge counter', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.getByText('AC Unit Offline')).toBeInTheDocument();
    expect(screen.getByText('High Power Spike')).toBeInTheDocument();
    expect(screen.getByText('Firmware Updated')).toBeInTheDocument();
  });

  it('filters notifications by category tabs and unread tab', () => {
    renderComponent();

    // Click Unread tab
    const unreadTab = screen.getByRole('tab', { name: /Unread \(2\)/i });
    fireEvent.click(unreadTab);

    expect(screen.getByText('AC Unit Offline')).toBeInTheDocument();
    expect(screen.getByText('High Power Spike')).toBeInTheDocument();
    expect(screen.queryByText('Firmware Updated')).not.toBeInTheDocument();

    // Click Energy category tab
    const energyTab = screen.getByRole('tab', { name: 'Energy' });
    fireEvent.click(energyTab);

    expect(screen.getByText('High Power Spike')).toBeInTheDocument();
    expect(screen.queryByText('AC Unit Offline')).not.toBeInTheDocument();
  });

  it('marks single notification as read', () => {
    renderComponent();

    const markReadButtons = screen.getAllByLabelText(/Mark notification as read/i);
    expect(markReadButtons.length).toBe(2);

    fireEvent.click(markReadButtons[0]!);

    expect(useStore.getState().notifications.find((n) => n.id === 'notif-1')?.read).toBe(true);
    expect(screen.getByText('1 unread')).toBeInTheDocument();
  });

  it('marks all notifications as read', () => {
    renderComponent();

    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
    fireEvent.click(markAllBtn);

    expect(screen.getByText('All read')).toBeInTheDocument();
    expect(useStore.getState().notifications.every((n) => n.read)).toBe(true);
  });

  it('dismisses a single notification', () => {
    renderComponent();

    const dismissButtons = screen.getAllByLabelText(/Dismiss notification/i);
    fireEvent.click(dismissButtons[0]!);

    expect(useStore.getState().notifications.find((n) => n.id === 'notif-1')).toBeUndefined();
    expect(screen.queryByText('AC Unit Offline')).not.toBeInTheDocument();
  });

  it('clears all notifications and displays empty state', () => {
    renderComponent();

    const clearAllBtn = screen.getByRole('button', { name: /Clear all/i });
    fireEvent.click(clearAllBtn);

    expect(screen.getByText(/No notifications found/i)).toBeInTheDocument();
    expect(useStore.getState().notifications).toHaveLength(0);
  });
});
