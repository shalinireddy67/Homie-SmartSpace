import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useRuntime } from '@/hooks/useRuntime';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ToastContainer } from '@/components/common/ToastContainer';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  // Mount runtime orchestration
  useRuntime();
  // Manage per-route document title
  useDocumentTitle();

  return (
    <div className="min-h-[100dvh] bg-outerCanvas text-text sm:p-3 lg:p-5 flex flex-col antialiased selection:bg-accent/20">
      {/* Toast Notification Layer */}
      <ToastContainer />

      {/* Skip to Content Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Floating Rounded Dashboard Frame */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto bg-surface-subtle sm:rounded-2xl border border-border-subtle">
        <Header />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto pb-24 md:pb-8 outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};
