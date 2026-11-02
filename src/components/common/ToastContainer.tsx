import React, { useEffect } from 'react';
import { useStore } from '@/store';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast, NotificationSeverity } from '@/types';

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.durationMs ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  const icons: Record<NotificationSeverity, React.ReactNode> = {
    info: <Info className="h-5 w-5 text-accent" />,
    success: <CheckCircle className="h-5 w-5 text-success" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    danger: <AlertCircle className="h-5 w-5 text-danger" />,
  };

  const borders: Record<NotificationSeverity, string> = {
    info: 'border-accent/30 bg-surface shadow-soft',
    success: 'border-success/30 bg-surface shadow-soft',
    warning: 'border-warning/30 bg-surface shadow-soft',
    danger: 'border-danger/30 bg-surface shadow-soft',
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 p-4 rounded-2xl border max-w-sm w-full transition-all duration-200 ${borders[toast.severity]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.severity]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-text leading-tight">{toast.title}</h4>
        {toast.message && (
          <p className="mt-1 text-xs text-text-muted leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-text-muted hover:text-text p-1 rounded-lg hover:bg-surface-elevated transition-colors"
      >
        <X className="h-4 w-4" />
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
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
