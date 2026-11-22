import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useRouteSeo, ROUTE_SEO_CONFIG, NOT_FOUND_SEO_META } from '@/hooks/useRouteSeo';

const TestSeoComponent = () => {
  const meta = useRouteSeo();
  return <div data-testid="seo-title">{meta.title}</div>;
};

describe('useRouteSeo Hook', () => {
  beforeEach(() => {
    document.title = '';
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.remove();
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.remove();
  });

  it('updates document.title and canonical link for public landing page (/) with index, follow', async () => {
    const expected = ROUTE_SEO_CONFIG['/']!;
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestSeoComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('seo-title')).toHaveTextContent(expected.title);
    await waitFor(() => {
      expect(document.title).toBe(expected.title);
    });

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical?.getAttribute('href')).toBe(expected.canonical);

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('index, follow');
  });

  it('updates document.title and canonical link for Energy Analytics (/app/energy) with noindex', async () => {
    const expected = ROUTE_SEO_CONFIG['/app/energy']!;
    render(
      <MemoryRouter initialEntries={['/app/energy']}>
        <Routes>
          <Route path="/app/energy" element={<TestSeoComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('seo-title')).toHaveTextContent(expected.title);
    await waitFor(() => {
      expect(document.title).toBe(expected.title);
    });

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe(expected.canonical);

    const desc = document.querySelector('meta[name="description"]');
    expect(desc?.getAttribute('content')).toBe(expected.description);

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('updates document.title and canonical link for Event History (/app/events)', async () => {
    const expected = ROUTE_SEO_CONFIG['/app/events']!;
    render(
      <MemoryRouter initialEntries={['/app/events']}>
        <Routes>
          <Route path="/app/events" element={<TestSeoComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('seo-title')).toHaveTextContent(expected.title);
    await waitFor(() => {
      expect(document.title).toBe(expected.title);
    });

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe(expected.canonical);
  });

  it('sets noindex and 404 title when navigating to an unknown route (/random-unknown)', async () => {
    render(
      <MemoryRouter initialEntries={['/random-unknown']}>
        <Routes>
          <Route path="*" element={<TestSeoComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('seo-title')).toHaveTextContent(NOT_FOUND_SEO_META.title);
    await waitFor(() => {
      expect(document.title).toBe(NOT_FOUND_SEO_META.title);
    });

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe(NOT_FOUND_SEO_META.canonical);

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('noindex, nofollow');
  });
});
