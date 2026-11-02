import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventHistoryPage } from '@/pages/EventHistoryPage';
import { useStore, initializeStore } from '@/store';
import type { LogEvent } from '@/types';

// Mock TanStack Virtual for jsdom environment where clientHeight is 0
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 56,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, i) => ({
        index: i,
        key: i,
        start: i * 56,
        size: 56,
      })),
  }),
}));

const mockEvents: LogEvent[] = [
  {
    id: 'evt-1',
    timestamp: 1730476800000,
    type: 'device_state',
    severity: 'info',
    deviceId: 'dev-1',
    roomId: 'room-1',
    description: 'Living Room Light turned on',
  },
  {
    id: 'evt-2',
    timestamp: 1730476700000,
    type: 'security',
    severity: 'alert',
    deviceId: 'dev-2',
    roomId: 'room-2',
    description: 'Front Door Lock unlocked',
    details: { method: 'keypad', user: 'Admin' },
  },
  {
    id: 'evt-3',
    timestamp: 1730476600000,
    type: 'energy',
    severity: 'warning',
    deviceId: 'dev-3',
    roomId: 'room-1',
    description: 'Power surge detected over 2500W',
  },
];

describe('EventHistoryPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    initializeStore(1730476800000);
    useStore.getState().setEvents(mockEvents);
  });

  it('renders page title, 60 FPS badge, and filter toolbar', () => {
    render(<EventHistoryPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Event History/i })).toBeInTheDocument();
    expect(screen.getByText('TanStack Virtual 60 FPS')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search descriptions, devices\.\.\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by event type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by severity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by room/i)).toBeInTheDocument();
  });

  it('filters events by text query', () => {
    render(<EventHistoryPage />);

    const searchInput = screen.getByPlaceholderText(/Search descriptions, devices\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Front Door' } });

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/of 3 events/i)).toBeInTheDocument();
  });

  it('filters events by event type', () => {
    render(<EventHistoryPage />);

    const typeSelect = screen.getByLabelText(/Filter by event type/i);
    fireEvent.change(typeSelect, { target: { value: 'security' } });

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/of 3 events/i)).toBeInTheDocument();
  });

  it('filters events by severity level', () => {
    render(<EventHistoryPage />);

    const sevSelect = screen.getByLabelText(/Filter by severity/i);
    fireEvent.change(sevSelect, { target: { value: 'alert' } });

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/of 3 events/i)).toBeInTheDocument();
  });

  it('toggles sort order between newest and oldest', () => {
    render(<EventHistoryPage />);

    const sortBtn = screen.getByRole('button', { name: /Sort order: currently newest first/i });
    fireEvent.click(sortBtn);

    expect(screen.getByText('Oldest')).toBeInTheDocument();
  });

  it('opens inspector modal when clicking an event row and closes it', async () => {
    render(<EventHistoryPage />);

    const row = screen.getByLabelText(/Event: Front Door Lock unlocked/i);
    fireEvent.click(row);

    expect(screen.getByRole('heading', { level: 2, name: 'Audit Event Details' })).toBeInTheDocument();
    expect(screen.getByText('evt-2')).toBeInTheDocument();
    expect(screen.getAllByText(/Front Door Lock unlocked/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/keypad/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Audit Event Details' })).not.toBeInTheDocument();
    });
  });

  it('exports filtered events as JSON', () => {
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(<EventHistoryPage />);

    const exportBtn = screen.getByRole('button', { name: /Export filtered events as JSON/i });
    fireEvent.click(exportBtn);

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('clears active filters and restores full event list', () => {
    render(<EventHistoryPage />);

    const searchInput = screen.getByPlaceholderText(/Search descriptions, devices\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent query' } });

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/of 3 events/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Clear filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/of 3 events/i)).toBeInTheDocument();
  });
});
