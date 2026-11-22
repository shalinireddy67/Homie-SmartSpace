import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { clearSession } from '@/services/session';

async function checkA11y(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false }, // jsdom cannot compute styled layout colors
    },
  });
  return results.violations;
}

describe('Axe Accessibility Scans (Public Landing & Auth Pages)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
  });

  it('LandingPage produces zero axe accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>
    );

    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it('LoginPage produces zero axe accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it('SignupPage produces zero axe accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/signup']}>
        <SignupPage />
      </MemoryRouter>
    );

    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });
});
