import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { formatRelativeTime } from '@/utils/formatters';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { Notification, NotificationCategory, NotificationSeverity } from '@/types';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Shield,
  Zap,
  Cpu,
  Sliders,
} from 'lucide-react';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'unread' | NotificationCategory;

interface NotificationGroup {
  label: string;
  items: Notification[];
}

function groupNotificationsByTime(notifications: Notification[]): NotificationGroup[] {
  if (notifications.length === 0) return [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const notif of notifications) {
    if (notif.timestamp >= todayStart) {
      todayItems.push(notif);
    } else if (notif.timestamp >= yesterdayStart) {
      yesterdayItems.push(notif);
    } else {
      earlierItems.push(notif);
    }
  }

  const groups: NotificationGroup[] = [];
  if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems });

  if (groups.length === 0 && notifications.length > 0) {
    groups.push({ label: 'All Notifications', items: notifications });
  }

  return groups;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const notifications = useStore((s) => s.notifications);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const clearNotification = useStore((s) => s.clearNotification);
  const setNotifications = useStore((s) => s.setNotifications);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'unread') return !n.read;
      return n.category === activeTab;
    });
  }, [notifications, activeTab]);

  const groupedNotifications = useMemo(() => {
    return groupNotificationsByTime(filteredNotifications);
  }, [filteredNotifications]);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first && last) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last && first) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus the close button when drawer opens
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const categoryIcons: Record<NotificationCategory, React.ReactNode> = {
    device: <Cpu className="h-3 w-3" />,
    security: <Shield className="h-3 w-3" />,
    energy: <Zap className="h-3 w-3" />,
    system: <Sliders className="h-3 w-3" />,
    automation: <Bell className="h-3 w-3" />,
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: `All (${notifications.length})` },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'device', label: 'Device' },
    { id: 'security', label: 'Security' },
    { id: 'energy', label: 'Energy' },
    { id: 'system', label: 'System' },
    { id: 'automation', label: 'Automations' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full sm:max-w-md bg-surface border-l border-border-subtle shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-card/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-subtle text-accent border border-border-subtle shrink-0">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text tracking-tight">Notification Center</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {unreadCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {unreadCount} unread
                  </span>
                ) : (
                  <span className="text-[11px] text-text-muted font-medium">All caught up</span>
                )}
              </div>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close notification center"
            className="p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-elevated transition-colors focus-ring min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Action Controls & Full Page Link */}
        <div className="px-4 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2 bg-surface">
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-xs px-2.5 py-1 min-h-[36px]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNotifications([])}
                aria-label="Clear all notifications"
                className="text-xs px-2.5 py-1 min-h-[36px] text-text-muted hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear all</span>
              </Button>
            )}
          </div>

          <Link
            to="/app/notifications"
            onClick={onClose}
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1 focus-ring rounded-xl px-2 py-1"
          >
            <span>Full page</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Filter Pills */}
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="px-4 py-2 border-b border-border-subtle flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-surface-card/30"
        >
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                let nextIdx = idx;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  nextIdx = (idx + 1) % tabs.length;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  nextIdx = (idx - 1 + tabs.length) % tabs.length;
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  nextIdx = 0;
                } else if (e.key === 'End') {
                  e.preventDefault();
                  nextIdx = tabs.length - 1;
                } else {
                  return;
                }
                const nextTab = tabs[nextIdx];
                if (nextTab) {
                  setActiveTab(nextTab.id);
                  tabRefs.current[nextIdx]?.focus();
                }
              }}
              className={`px-3 py-1 text-xs whitespace-nowrap rounded-full border transition-all duration-200 focus-ring ${
                activeTab === tab.id
                  ? 'bg-accent-subtle text-text border-accent font-semibold shadow-xs'
                  : 'bg-surface border-border-subtle text-text-muted hover:text-text hover:bg-surface-elevated'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center mx-auto text-text-muted">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-text">No notifications found</h3>
              <p className="text-xs text-text-muted max-w-xs mx-auto">
                {activeTab === 'unread'
                  ? 'You are all caught up! No unread alerts.'
                  : 'There are no notifications in this category.'}
              </p>
            </div>
          ) : (
            groupedNotifications.map((group) => (
              <div key={group.label} className="space-y-2.5">
                {/* Group Time Header */}
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted pt-1">
                  <span>{group.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card border border-border-subtle">
                    {group.items.length}
                  </span>
                </div>

                {/* Notification Items */}
                <div className="space-y-2">
                  {group.items.map((notif) => {
                    const cfg = severityConfigs[notif.severity] || severityConfigs.info;
                    return (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-2 ${
                          notif.read
                            ? 'bg-surface-card/60 border-border-subtle opacity-85 hover:opacity-100'
                            : `bg-surface ${cfg.border} shadow-soft`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`shrink-0 mt-0.5 p-1.5 rounded-xl border flex items-center justify-center ${cfg.iconBg}`}
                            >
                              {cfg.icon}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4
                                  className={`text-xs font-semibold leading-tight ${
                                    notif.read ? 'text-text' : 'text-text font-bold'
                                  }`}
                                >
                                  {notif.title}
                                </h4>
                                {!notif.read ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-accent-subtle text-[10px] font-bold text-accent">
                                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                                    Unread
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-text-muted font-medium">Read</span>
                                )}
                              </div>

                              <p className="text-xs text-text-muted leading-relaxed break-words">
                                {notif.message}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!notif.read && (
                              <button
                                type="button"
                                onClick={() => markAsRead(notif.id)}
                                aria-label="Mark notification as read"
                                title="Mark read"
                                className="p-1 rounded-xl text-text-muted hover:text-accent hover:bg-surface-elevated transition-colors focus-ring min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => clearNotification(notif.id)}
                              aria-label="Dismiss notification"
                              title="Dismiss"
                              className="p-1 rounded-xl text-text-muted hover:text-danger hover:bg-surface-elevated transition-colors focus-ring min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Footer: Category badge, timestamp, optional link */}
                        <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-subtle/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" size="sm" className="gap-1 text-[10px] py-0 px-2">
                              {categoryIcons[notif.category]}
                              <span className="capitalize">{notif.category}</span>
                            </Badge>
                            <span className="tabular-nums">{formatRelativeTime(notif.timestamp)}</span>
                          </div>

                          {notif.link && (
                            <Link
                              to={notif.link}
                              onClick={onClose}
                              className="text-accent hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default NotificationDrawer;
