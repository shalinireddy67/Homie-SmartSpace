import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useStore } from '@/store';
import { formatRelativeTime } from '@/utils/formatters';
import type { Notification, NotificationCategory, NotificationSeverity } from '@/types';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ExternalLink,
  Shield,
  Zap,
  Cpu,
  Sliders,
} from 'lucide-react';

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

export const NotificationsPage: React.FC = () => {
  const notifications = useStore((s) => s.notifications);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const clearNotification = useStore((s) => s.clearNotification);
  const setNotifications = useStore((s) => s.setNotifications);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

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

  const severityConfigs: Record<
    NotificationSeverity,
    { icon: React.ReactNode; iconBg: string; border: string; glow: string }
  > = {
    info: {
      icon: <Info className="h-4 w-4 text-accent" />,
      iconBg: 'bg-accent/15 border-accent/25',
      border: 'border-accent/30',
      glow: 'shadow-accent/5',
    },
    success: {
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      iconBg: 'bg-success/15 border-success/25',
      border: 'border-success/30',
      glow: 'shadow-success/5',
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4 text-warning-strong dark:text-warning" />,
      iconBg: 'bg-warning/15 border-warning/25',
      border: 'border-warning/30',
      glow: 'shadow-warning/5',
    },
    danger: {
      icon: <AlertCircle className="h-4 w-4 text-danger" />,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">Notifications</h1>
            {unreadCount > 0 ? (
              <span
                aria-live="polite"
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-subtle text-text border border-border tabular-nums whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span>{unreadCount} unread</span>
              </span>
            ) : (
              <span
                aria-live="polite"
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-surface-card border border-border-subtle text-text-muted whitespace-nowrap"
              >
                All read
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted mt-1">
            Central alert log with ongoing condition deduplication and severity categorization.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-4 w-4" />
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
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear all</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Notification category filters"
        className="flex items-center sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible pb-2.5 scrollbar-none border-b border-border-subtle"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 min-h-[44px] sm:min-h-[34px] sm:py-1.5 rounded-full text-xs whitespace-nowrap border transition-all focus-ring ${
              activeTab === tab.id
                ? 'bg-accent-subtle text-text border-accent font-semibold shadow-xs'
                : 'bg-surface border-border-subtle text-text-muted hover:text-text hover:bg-surface-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <Card padding="lg" className="border-dashed border-border bg-surface-card rounded-3xl text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center mx-auto text-text-muted">
            <Bell className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-text">No notifications found</h2>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {activeTab === 'unread'
              ? 'You are all caught up! No unread alerts or notifications.'
              : 'There are no notifications matching the selected filter category.'}
          </p>
        </Card>
      ) : (
        <div
          role="list"
          aria-label="Notifications list"
          className="space-y-6"
        >
          {groupedNotifications.map((group) => (
            <section key={group.label} className="space-y-3">
              {/* Group Header */}
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted px-1">
                <span>{group.label}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card border border-border-subtle">
                  {group.items.length}
                </span>
              </div>

              {/* Group Cards */}
              <div className="space-y-3">
                {group.items.map((notif: Notification) => {
                  const cfg = severityConfigs[notif.severity] || severityConfigs.info;
                  return (
                    <Card
                      key={notif.id}
                      role="listitem"
                      className={`p-4 sm:p-5 rounded-3xl transition-all duration-200 border ${
                        notif.read
                          ? 'bg-surface-card/75 border-border-subtle text-text-muted'
                          : `bg-surface ${cfg.border} shadow-soft`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`shrink-0 mt-0.5 p-2 rounded-2xl border flex items-center justify-center ${cfg.iconBg}`}
                          >
                            {cfg.icon}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                className={`text-sm font-semibold leading-tight ${
                                  notif.read ? 'text-text' : 'text-text font-bold'
                                }`}
                              >
                                {notif.title}
                              </h3>
                              {!notif.read ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-subtle text-[11px] font-bold text-accent">
                                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                                  <span>Unread</span>
                                </span>
                              ) : (
                                <span className="text-xs text-text-muted font-medium">Read</span>
                              )}
                              <Badge variant="outline" size="sm" className="gap-1">
                                {categoryIcons[notif.category]}
                                <span className="capitalize">{notif.category}</span>
                              </Badge>
                              <Badge
                                variant={
                                  notif.severity === 'danger'
                                    ? 'danger'
                                    : notif.severity === 'warning'
                                    ? 'warning'
                                    : notif.severity === 'success'
                                    ? 'success'
                                    : 'default'
                                }
                                size="sm"
                              >
                                {notif.severity}
                              </Badge>
                            </div>

                            <p className="text-xs text-text-muted leading-relaxed break-words">
                              {notif.message}
                            </p>

                            <div className="flex items-center gap-3 pt-1 text-[11px] text-text-muted">
                              <span className="tabular-nums">{formatRelativeTime(notif.timestamp)}</span>
                              {notif.link && (
                                <Link
                                  to={notif.link}
                                  className="text-accent hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <span>Inspect</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.read && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notif.id)}
                              aria-label="Mark notification as read"
                              className="text-xs p-1.5 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => clearNotification(notif.id)}
                            aria-label="Dismiss notification"
                            className="text-xs p-1.5 text-text-muted hover:text-danger min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
export default NotificationsPage;
