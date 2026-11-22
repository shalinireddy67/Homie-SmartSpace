import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Standard jsdom matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Recharts ResponsiveContainer for jsdom test environment with non-zero dimensions
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        'div',
        { className: 'recharts-responsive-container', style: { width: 800, height: 300 } },
        React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, {
              width: 800,
              height: 300,
            })
          : children
      ),
  };
});

// Opt in to React Router v7 future flags in BrowserRouter & MemoryRouter to eliminate deprecation noise in tests
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const ActualMemoryRouter = actual.MemoryRouter as React.ComponentType<{
    future?: Record<string, boolean>;
    [key: string]: unknown;
  }>;
  const ActualBrowserRouter = actual.BrowserRouter as React.ComponentType<{
    future?: Record<string, boolean>;
    [key: string]: unknown;
  }>;

  return {
    ...actual,
    MemoryRouter: ({ future, ...props }: { future?: Record<string, boolean>; [key: string]: unknown }) =>
      React.createElement(ActualMemoryRouter, {
        ...props,
        future: {
          v7_startTransition: true,
          v7_relativeSplatPath: true,
          ...future,
        },
      }),
    BrowserRouter: ({ future, ...props }: { future?: Record<string, boolean>; [key: string]: unknown }) =>
      React.createElement(ActualBrowserRouter, {
        ...props,
        future: {
          v7_startTransition: true,
          v7_relativeSplatPath: true,
          ...future,
        },
      }),
  };
});
