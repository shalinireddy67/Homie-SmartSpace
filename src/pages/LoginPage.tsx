import React, { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { setSession, hasActiveSession, clearSession } from '@/services/session';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { APP_NAME, APP_TAGLINE } from '@/constants/branding';
import {
  Home,
  Sun,
  Moon,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Users,
  AlertCircle,
  Sparkles,
  LogIn,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/app';
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const isAlreadyLoggedIn = hasActiveSession();

  const handleEnterDemoDirect = () => {
    setSession({ mode: 'demo', startedAt: Date.now() });
    navigate(returnTo, { replace: true });
  };

  const handleUseDemoCredentials = () => {
    setEmail('demo@homie.example');
    setPassword('demo-house');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    // Demo credentials check
    if (
      email.trim().toLowerCase() === 'demo@homie.example' &&
      password === 'demo-house'
    ) {
      setSession({ mode: 'demo', startedAt: Date.now() });
      navigate(returnTo, { replace: true });
      return;
    }

    // Household backend credentials simulated rejection
    setErrorMessage(
      'Invalid credentials or household backend unreachable. Use the demo credentials above to enter.'
    );
    setTimeout(() => errorRef.current?.focus(), 50);
  };

  const handleRestartDemo = () => {
    clearSession();
    handleEnterDemoDirect();
  };

  return (
    <div className="min-h-screen bg-outerCanvas text-text flex flex-col selection:bg-accent/20 antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/95 backdrop-blur transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 focus-ring rounded-xl py-1 px-1.5 -ml-1.5"
            aria-label={`${APP_NAME} home`}
          >
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm shadow-accent/20">
              <Home className="w-5 h-5" aria-hidden="true" />
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-card transition-colors focus-ring border border-border-subtle"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-accent" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-text-muted" aria-hidden="true" />
              )}
            </button>

            <Link
              to="/"
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-border-subtle text-text hover:bg-surface-card transition-colors focus-ring"
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full space-y-6">
          {/* Active Session Notice if already logged in */}
          {isAlreadyLoggedIn && (
            <div className="p-4 rounded-2xl bg-accent-subtle border border-accent/30 text-text flex flex-col sm:flex-row items-center justify-between gap-3 shadow-soft">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs font-semibold text-text">
                    You have an active demo session
                  </div>
                  <div className="text-[11px] text-text-muted">
                    You can continue your current session or reset it.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(returnTo)}
                >
                  <span>Continue to dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestartDemo}
                >
                  Restart session
                </Button>
              </div>
            </div>
          )}

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              Sign in to Homie SmartSpace
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              Explore the simulated smart home dashboard or test credential sign-in.
            </p>
          </div>

          {/* Split Container: Option A (Demo) on left, Option B (Household) on right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* OPTION A: Try the Demo (Featured First) */}
            <Card
              aria-label="Demo House quick access"
              className="p-6 rounded-3xl border border-accent/40 bg-surface shadow-soft flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <span className="inline-block bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Recommended
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center">
                    <Sparkles className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text">Option A: Try the Demo</h2>
                    <p className="text-xs text-text-muted">Instant full access to simulated house</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-text">
                    <span>Demo Residence</span>
                    <Badge variant="outline" size="sm" className="text-accent border-accent/30">
                      14 Devices
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-text-muted">
                      <span>Email:</span>
                      <code className="font-mono text-accent font-semibold selection:bg-accent/30">
                        demo@homie.example
                      </code>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Password:</span>
                      <code className="font-mono text-accent font-semibold selection:bg-accent/30">
                        demo-house
                      </code>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-subtle/60">
                    <div className="text-[11px] font-medium text-text-muted mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Pre-configured members:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-1.5 rounded-lg bg-surface border border-border-subtle/50">
                        <div className="font-semibold text-text truncate">Alex M.</div>
                        <div className="text-text-muted">Owner</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-surface border border-border-subtle/50">
                        <div className="font-semibold text-text truncate">Sam T.</div>
                        <div className="text-text-muted">Member</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-surface border border-border-subtle/50">
                        <div className="font-semibold text-text truncate">Jordan L.</div>
                        <div className="text-text-muted">Guest</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  onClick={handleEnterDemoDirect}
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Enter demo directly</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs"
                  onClick={handleUseDemoCredentials}
                >
                  <span>Fill demo credentials in form</span>
                </Button>
              </div>
            </Card>

            {/* OPTION B: Household Sign In */}
            <Card
              aria-label="Household sign in form"
              className="p-6 rounded-3xl border border-border-subtle bg-surface shadow-soft flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text">Option B: Household Sign In</h2>
                    <p className="text-xs text-text-muted">Use credentials or test form validation</p>
                  </div>
                  <Badge variant="outline" size="sm" className="text-text-muted">
                    L1 Preview
                  </Badge>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div
                    ref={errorRef}
                    id="login-error"
                    tabIndex={-1}
                    role="alert"
                    className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2 outline-none animate-in fade-in duration-150"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form id="household-login-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-semibold text-text"
                    >
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@homie.example"
                      aria-describedby={errorMessage ? 'login-error' : undefined}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-text placeholder:text-text-muted/50 text-xs focus-ring transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-semibold text-text"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-text-muted hover:text-text focus-ring rounded px-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <span className="flex items-center gap-1">
                            <EyeOff className="w-3 h-3" aria-hidden="true" />
                            <span>Hide</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" aria-hidden="true" />
                            <span>Show</span>
                          </span>
                        )}
                      </button>
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      aria-describedby={errorMessage ? 'login-error' : undefined}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-text placeholder:text-text-muted/50 text-xs focus-ring transition-colors"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                  >
                    <span>Sign in with credentials</span>
                  </Button>
                </form>
              </div>

              <div className="pt-4 border-t border-border-subtle text-center space-y-2">
                <p className="text-xs text-text-muted">
                  Don't have a household profile yet?{' '}
                  <Link
                    to="/signup"
                    className="text-accent hover:underline font-semibold focus-ring rounded"
                  >
                    Create household
                  </Link>
                </p>
                <div className="text-[11px] text-text-muted/80 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3 text-accent" aria-hidden="true" />
                  <span>Frontend demo. All data stored locally.</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface/80 py-6 px-4 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} {APP_NAME}. {APP_TAGLINE}
      </footer>
    </div>
  );
};

export default LoginPage;
