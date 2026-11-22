import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { setSession } from '@/services/session';
import { APP_NAME, APP_TAGLINE } from '@/constants/branding';
import {
  Home,
  Sun,
  Moon,
  ArrowRight,
  Shield,
  Zap,
  Sliders,
  Activity,
  Bell,
  Clock,
  ExternalLink,
  ChevronUp,
  Menu,
  X,
  Users,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEnterDemo = () => {
    setSession({ mode: 'demo', startedAt: Date.now() });
    navigate('/app');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Household', href: '#household' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <div className="min-h-screen bg-outerCanvas text-text flex flex-col selection:bg-accent/20 antialiased">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus-ring rounded-md py-1 px-1.5 -ml-1.5"
            aria-label={`${APP_NAME} home`}
          >
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white dark:text-[#181816]">
              <Home className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-text leading-tight">
                {APP_NAME}
              </span>
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                Simulated Space
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Landing page navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-text-muted"
          >
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-text transition-colors focus-ring rounded-md px-2 py-1"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-elevated transition-colors focus-ring border border-border-subtle"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-text-muted" aria-hidden="true" />
              )}
            </button>

            {/* Sign in Button */}
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-md border border-border-subtle text-text hover:bg-surface-elevated transition-colors focus-ring"
            >
              Sign in
            </Link>

            {/* Try the Demo Primary CTA */}
            <button
              type="button"
              onClick={handleEnterDemo}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md bg-accent text-white dark:text-[#181816] hover:bg-accent-hover transition-all focus-ring active:translate-y-px"
            >
              <span>Try the demo</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-elevated focus-ring border border-border-subtle"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-surface px-4 py-4 space-y-3">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-text-muted hover:text-text px-2 py-1.5 rounded-md focus-ring"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-2 border-t border-border-subtle flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-xs font-semibold px-3 py-2.5 rounded-md border border-border-subtle text-text hover:bg-surface-elevated focus-ring"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Landing Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-12 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent-subtle/40 border border-accent/20 text-accent text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Frontend-Only Interactive Simulation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text leading-[1.12]">
            Modern Smart Home Control,{' '}
            <span className="text-accent">
              Beautifully Simulated
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-text-muted leading-relaxed">
            Experience a responsive smart home dashboard with room-based device controls,
            real-time energy analytics, custom automation rules, and live telemetry audit logs—running entirely in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleEnterDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-md bg-accent text-white dark:text-[#181816] hover:bg-accent-hover transition-all focus-ring active:translate-y-px"
            >
              <span>Try the live demo</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-md border border-border-subtle bg-surface text-text hover:bg-surface-elevated transition-all focus-ring"
            >
              <span>Sign in</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-text-muted pt-1">
            <Shield className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <span>No real devices. All data and telemetry are simulated.</span>
          </div>
        </section>

        {/* Product Preview Section */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pb-16 sm:pb-24">
          <div className="rounded-xl border border-border-subtle bg-surface-card p-2 sm:p-3">
            <div className="relative rounded-lg overflow-hidden border border-border-subtle bg-surface aspect-[16/10]">
              <img
                src={
                  theme === 'dark'
                    ? '/screenshots/overview-1440-dark.png'
                    : '/screenshots/overview-1440-light.png'
                }
                alt="Homie SmartSpace Dashboard Overview showing device status cards, energy telemetry, and environment gauges"
                loading="lazy"
                width={1440}
                height={900}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section
          id="features"
          className="scroll-mt-20 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-border-subtle"
        >
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Engineered for Complete IoT Clarity
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Every card, dial, chart, and alert operates against a deterministic simulation
              loop designed for responsiveness and zero latency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Feature 1 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Home className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">Room-Based Controls</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Group devices across 5 distinct household zones: living room, master bedroom, culinary kitchen, bath, and outdoor patio.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">Live Telemetry Loop</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Deterministic virtual clock drives live power readings, temperature curves, and simulated online/offline transitions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Sliders className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">Dial & Light Controls</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Smooth radial thermostat arc dial and fine-grained brightness and hue adjustments backed by optimistic updates.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Zap className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">Energy & Anomaly Graphs</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Historical wattage analysis with flexible range filters (1h to 30d), room cost breakdowns, and surge detection.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Sliders className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">Dry-Run Automations</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Build triggers with conditions and actions. Test new automation routines with an isolated dry-run simulator.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Bell className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">Prioritized Notification Hub</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Cooldown throttling, deduplication keys, category filters, and direct deep links to affected rooms and devices.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Clock className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">10,000+ Event Audit Log</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                TanStack-virtualized event log maintaining 60 FPS scrolling with sub-millisecond full-text and category search.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-5 rounded-lg border border-border-subtle bg-surface space-y-3">
              <div className="w-9 h-9 rounded-md bg-surface-elevated text-accent flex items-center justify-center border border-border-subtle">
                <Moon className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-sm text-text">WCAG AA Themes</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Hand-tuned 60-30-10 palette exceeding WCAG 2.2 AA contrast standards in both dark and light presentation modes.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="scroll-mt-20 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-border-subtle"
        >
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              How the Simulation Works
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Everything runs locally in your browser with zero server setup or account friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-border-subtle bg-surface space-y-4">
              <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border-subtle text-accent font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="font-semibold text-sm text-text">Launch the Demo</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Start instantly with a single click. No credit card, no sign-up form, and no external API keys required.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border-subtle bg-surface space-y-4">
              <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border-subtle text-accent font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="font-semibold text-sm text-text">Control & Automate</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Toggle lighting fixtures, adjust thermostat targets, and simulate dry-run automations with optimistic feedback.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border-subtle bg-surface space-y-4">
              <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border-subtle text-accent font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="font-semibold text-sm text-text">Inspect Real-Time Logs</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Watch simulated wattage react to device states, review power anomalies, and audit thousands of virtual log entries.
              </p>
            </div>
          </div>
        </section>

        {/* Household Section */}
        <section
          id="household"
          className="scroll-mt-20 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-border-subtle"
        >
          <div className="p-6 sm:p-8 rounded-xl border border-border-subtle bg-surface space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" aria-hidden="true" />
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
                    One home, many people
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-text-muted">
                  Planned multi-user profile management for shared residences and family living spaces.
                </p>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-subtle text-accent border border-accent/20 uppercase tracking-wide">
                Coming soon
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Household profiles will provide role-based permissions (Owner, Member, Guest) and personalized room views.
              In the current demo release, full administrative control is available across all zones.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg border border-border-subtle bg-surface-card flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-semibold text-xs flex items-center justify-center">
                  AM
                </div>
                <div>
                  <div className="text-xs font-semibold text-text">Alex Morgan</div>
                  <div className="text-[11px] text-text-muted">Owner (Admin)</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border-subtle bg-surface-card flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-semibold text-xs flex items-center justify-center">
                  ST
                </div>
                <div>
                  <div className="text-xs font-semibold text-text">Sam Taylor</div>
                  <div className="text-[11px] text-text-muted">Member (Full Control)</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border-subtle bg-surface-card flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-semibold text-xs flex items-center justify-center">
                  JL
                </div>
                <div>
                  <div className="text-xs font-semibold text-text">Jordan Lee</div>
                  <div className="text-[11px] text-text-muted">Guest (Living Room Only)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          id="faq"
          className="scroll-mt-20 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-border-subtle"
        >
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Clear answers regarding application capabilities, data persistence, and device simulation.
            </p>
          </div>

          <div className="space-y-3">
            <details className="group rounded-lg border border-border-subtle bg-surface p-5 transition-colors [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-sm text-text focus-ring rounded-md">
                <span>What is Homie SmartSpace?</span>
                <span className="ml-4 shrink-0 text-text-muted transition-transform group-open:rotate-180">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-text-muted leading-relaxed border-t border-border-subtle/60 pt-3">
                Homie SmartSpace is an interactive smart home and IoT control dashboard built with React, TypeScript,
                and Tailwind CSS. It demonstrates real-time telemetry processing, deterministic state transitions,
                and optimistic device operations entirely on the client side.
              </p>
            </details>

            <details className="group rounded-lg border border-border-subtle bg-surface p-5 transition-colors [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-sm text-text focus-ring rounded-md">
                <span>Do I need real smart home hardware or an account to use the demo?</span>
                <span className="ml-4 shrink-0 text-text-muted transition-transform group-open:rotate-180">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-text-muted leading-relaxed border-t border-border-subtle/60 pt-3">
                No. All devices, power meters, environmental sensors, and automations are simulated in real time directly
                inside your browser. You can test and inspect every dashboard capability without physical hardware or an account.
              </p>
            </details>

            <details className="group rounded-lg border border-border-subtle bg-surface p-5 transition-colors [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-sm text-text focus-ring rounded-md">
                <span>Where is my configuration stored?</span>
                <span className="ml-4 shrink-0 text-text-muted transition-transform group-open:rotate-180">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-text-muted leading-relaxed border-t border-border-subtle/60 pt-3">
                All customized automation rules, scheduled timers, device state updates, and user preferences are
                saved locally in your browser using standard LocalStorage. Data is completely private and never leaves your computer.
              </p>
            </details>

            <details className="group rounded-lg border border-border-subtle bg-surface p-5 transition-colors [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-sm text-text focus-ring rounded-md">
                <span>Which browsers and viewports are supported?</span>
                <span className="ml-4 shrink-0 text-text-muted transition-transform group-open:rotate-180">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-text-muted leading-relaxed border-t border-border-subtle/60 pt-3">
                Homie SmartSpace is fully responsive and tested across mobile (375px+), tablet (768px+), and desktop (1440px+).
                It is supported on all modern evergreen browsers including Chrome, Edge, Safari, and Firefox.
              </p>
            </details>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="p-8 sm:p-10 rounded-xl bg-surface border border-border-subtle text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              Ready to explore Homie SmartSpace?
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-text-muted leading-relaxed">
              Jump straight into the live interactive dashboard or explore the source repository on GitHub.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleEnterDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold px-6 py-3 rounded-md bg-accent text-white dark:text-[#181816] hover:bg-accent-hover transition-all focus-ring active:translate-y-px"
              >
                <span>Launch live demo</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="https://github.com/shalinireddy67/Homie-SmartSpace"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold px-6 py-3 rounded-md border border-border-subtle bg-surface-card text-text hover:bg-surface-elevated transition-colors focus-ring"
              >
                <span>View on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface py-10 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-text-muted">
          {/* Brand & Note */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-semibold text-text">{APP_NAME}</span>
            <span className="hidden sm:inline text-border-subtle">•</span>
            <span>{APP_TAGLINE}</span>
            <span className="hidden sm:inline text-border-subtle">•</span>
            <span className="text-[11px]">All data is simulated</span>
          </div>

          {/* Links & Back to top */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/shalinireddy67/Homie-SmartSpace"
              target="_blank"
              rel="noreferrer"
              className="hover:text-text transition-colors inline-flex items-center gap-1.5 focus-ring rounded-lg px-2 py-1"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={scrollToTop}
              className="hover:text-text transition-colors inline-flex items-center gap-1 focus-ring rounded-lg px-2 py-1"
              aria-label="Back to top of page"
            >
              <span>Back to top</span>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-border-subtle/50 text-center text-[11px] text-text-muted/70">
          © {new Date().getFullYear()} {APP_NAME}. Built with React, TypeScript, and Tailwind CSS.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
