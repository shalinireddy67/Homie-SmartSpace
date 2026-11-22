import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { LandingPage } from '@/pages/LandingPage';

async function checkA11y(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false }, // jsdom cannot compute styled layout colors
    },
  });
  return results.violations;
}

describe('Axe Accessibility Scans (Public Landing Page)', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
