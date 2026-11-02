import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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
  it('renders 404 heading, message, and back to overview button', () => {
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
});
