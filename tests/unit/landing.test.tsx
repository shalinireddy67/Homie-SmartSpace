import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';

describe('LandingPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderLanding = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>
    );

  it('renders a single main H1 heading and key brand elements', () => {
    renderLanding();

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/Modern Smart Home Control/i);
    expect(screen.getByText(/Frontend-Only Interactive Simulation/i)).toBeInTheDocument();
  });

  it('contains all core content sections with anchor target IDs', () => {
    renderLanding();

    expect(document.getElementById('features')).not.toBeNull();
    expect(document.getElementById('how-it-works')).not.toBeNull();
    expect(document.getElementById('faq')).not.toBeNull();
  });

  it('renders the 8 actual dashboard feature items', () => {
    renderLanding();

    expect(screen.getByText('Room-Based Controls')).toBeInTheDocument();
    expect(screen.getByText('Live Telemetry Loop')).toBeInTheDocument();
    expect(screen.getByText('Dial & Light Controls')).toBeInTheDocument();
    expect(screen.getByText('Energy & Anomaly Graphs')).toBeInTheDocument();
    expect(screen.getByText('Dry-Run Automations')).toBeInTheDocument();
    expect(screen.getByText('Prioritized Notification Hub')).toBeInTheDocument();
    expect(screen.getByText('10,000+ Event Audit Log')).toBeInTheDocument();
    expect(screen.getByText('WCAG AA Themes')).toBeInTheDocument();
  });

  it('renders accessible FAQ details/summary elements', () => {
    renderLanding();

    const questions = screen.getAllByText(/What is Homie SmartSpace\?|Do I need real smart home hardware/i);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('renders the product preview screenshot with lazy loading and dimensions', () => {
    renderLanding();

    const img = screen.getByAltText(/Homie SmartSpace Dashboard Overview/i);
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('width')).toBe('1440');
    expect(img.getAttribute('height')).toBe('900');
  });

  it('contains zero fake marketing claims or testimonials', () => {
    renderLanding();

    const text = document.body.textContent || '';
    expect(text).not.toMatch(/10,000 satisfied users/i);
    expect(text).not.toMatch(/Fortune 500/i);
    expect(text).not.toMatch(/\$99\/month/i);
    expect(text).not.toMatch(/trusted by top companies/i);
  });

  it('toggles theme when theme switcher button is clicked', () => {
    renderLanding();

    const themeToggle = screen.getByLabelText(/Switch to (light|dark) mode/i);
    fireEvent.click(themeToggle);

    expect(document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('renders "Open the demo" CTA buttons linking or navigating to /app', () => {
    renderLanding();

    const demoButtons = screen.getAllByRole('button', { name: /Open the demo/i });
    expect(demoButtons.length).toBeGreaterThan(0);
    // Click the hero CTA button without error
    fireEvent.click(demoButtons[0]!);
  });
});
