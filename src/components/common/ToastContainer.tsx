import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast, NotificationSeverity } from '@/types';

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const remainingMsRef = useRef<number>(toast.durationMs ?? 4000);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isPaused) {
      // Calculate remaining time elapsed so far
      const elapsed = Date.now() - startTimeRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
      return;
    }

    startTimeRef.current = Date.now();
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingMsRef.current);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss, isPaused]);

  const severityConfigs: Record<
    NotificationSeverity,
    { icon: React.ReactNode; iconBg: string; border: string; glow: string }
  > = {
    info: {
      icon: <Info className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />,
      iconBg: 'bg-accent/15 border-accent/25',
      border: 'border-accent/30',
      glow: 'shadow-accent/5',
    },
    success: {
      icon: <CheckCircle className="h-4 w-4 text-success shrink-0" aria-hidden="true" />,
      iconBg: 'bg-success/15 border-success/25',
      border: 'border-success/30',
      glow: 'shadow-success/5',
    },
    warning: {
      icon: (
        <AlertTriangle
          className="h-4 w-4 text-warning-strong dark:text-warning shrink-0"
          aria-hidden="true"
        />
      ),
      iconBg: 'bg-warning/15 border-warning/25',
      border: 'border-warning/30',
      glow: 'shadow-warning/5',
    },
    danger: {
      icon: <AlertCircle className="h-4 w-4 text-danger shrink-0" aria-hidden="true" />,
      iconBg: 'bg-danger/15 border-danger/25',
      border: 'border-danger/30',
      glow: 'shadow-danger/5',
    },
  };

  const config = severityConfigs[toast.severity] || severityConfigs.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border bg-surface/95 dark:bg-surface/90 backdrop-blur-md shadow-xl transition-all duration-200 ${config.border} ${config.glow}`}
    >
      {/* Severity Icon Pill */}
      <div
        className={`shrink-0 p-2 rounded-xl border flex items-center justify-center ${config.iconBg}`}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h4 className="text-sm font-bold text-text leading-tight">{toast.title}</h4>
        {toast.message && (
          <p className="mt-1 text-xs text-text-muted leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-text-muted hover:text-text p-1.5 rounded-full hover:bg-surface-elevated transition-colors focus-ring min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notification alerts"
      className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
