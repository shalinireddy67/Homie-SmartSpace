import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFoundPage Component', () => {
  it('renders 404 heading, message, and back to overview button for public 404', () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    );

    expect(screen.getByText('404 Error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to overview/i })).toBeInTheDocument();
  });

  it('navigates to / when clicking Back to overview', () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    );

    const backBtn = screen.getByRole('button', { name: /Back to overview/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders "Back to dashboard" and navigates to /app when inside app shell', () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter initialEntries={['/app/unknown-view']}>
        <NotFoundPage isInAppShell={true} />
      </MemoryRouter>
    );

    const backBtn = screen.getByRole('button', { name: /Back to dashboard/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});
