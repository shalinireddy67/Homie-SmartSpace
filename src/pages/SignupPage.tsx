import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { setSession } from '@/services/session';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { APP_NAME, APP_TAGLINE } from '@/constants/branding';
import {
  Home,
  Sun,
  Moon,
  Sparkles,
  Info,
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleEnterDemo = () => {
    setSession({ mode: 'demo', startedAt: Date.now() });
    navigate('/app');
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
              to="/login"
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-border-subtle text-text hover:bg-surface-card transition-colors focus-ring"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="outline" size="sm" className="text-accent border-accent/30">
              Planned Capability
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              Create Household Account
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              Configure multi-member permissions and synchronize custom space configurations.
            </p>
          </div>

          <Card
            aria-label="Planned household registration form"
            className="p-6 sm:p-8 rounded-3xl border border-border-subtle bg-surface shadow-soft space-y-6"
          >
            {/* Honest Notice */}
            <div className="p-4 rounded-2xl bg-accent-subtle border border-accent/30 text-text space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Cloud Synchronization Coming Next</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Homie SmartSpace currently operates fully offline in client-only simulation mode.
                Backend cloud synchronization and member invitation links are planned for the next release.
                You can try the fully functional dashboard immediately with our live demo.
              </p>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="space-y-4 opacity-80"
              aria-label="Household form preview"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-household-name"
                  className="block text-xs font-semibold text-text"
                >
                  Household Name
                </label>
                <input
                  id="signup-household-name"
                  type="text"
                  disabled
                  defaultValue="Maple Residence"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-card text-text text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-full-name"
                  className="block text-xs font-semibold text-text"
                >
                  Your Full Name
                </label>
                <input
                  id="signup-full-name"
                  type="text"
                  disabled
                  defaultValue="Alex Morgan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-card text-text text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-text"
                >
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  disabled
                  defaultValue="alex@homie.example"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-card text-text text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-text"
                >
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  disabled
                  defaultValue="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-card text-text text-xs cursor-not-allowed"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled
                  className="w-full justify-center opacity-60 cursor-not-allowed"
                >
                  <span>Register Household (Coming Soon)</span>
                </Button>
              </div>
            </form>

            <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleEnterDemo}
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Try the live demo now</span>
              </Button>

              <Link
                to="/login"
                className="text-accent hover:underline font-semibold focus-ring rounded"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface/80 py-6 px-4 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} {APP_NAME}. {APP_TAGLINE}
      </footer>
    </div>
  );
};

export default SignupPage;
