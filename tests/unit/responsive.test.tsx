import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

describe('Responsive AppShell & Layout', () => {
  it('renders skip link, semantic header, navigation, and main landmarks', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <div data-testid="page-content">Test Page Content</div>
        </AppShell>
      </MemoryRouter>
    );

    // Skip to content link
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    // Semantic landmarks
    expect(screen.getByRole('banner')).toBeInTheDocument(); // <header>
    const navs = screen.getAllByRole('navigation'); // desktop sidebar and mobile bottom nav
    expect(navs.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('main')).toBeInTheDocument(); // <main>
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('contains proper responsive classes for mobile and desktop viewports', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <div>Responsive Test</div>
        </AppShell>
      </MemoryRouter>
    );

    // Sidebar should have hidden md:flex
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('hidden');
    expect(sidebar).toHaveClass('md:flex');

    // Bottom nav should have md:hidden
    const bottomNav = container.querySelector('nav[aria-label="Mobile Navigation"]');
    expect(bottomNav).toHaveClass('md:hidden');

    // Main content area should be responsive with min-w-0
    const main = container.querySelector('main');
    expect(main).toHaveClass('flex-1');
    expect(main).toHaveClass('max-w-7xl');
  });
});

