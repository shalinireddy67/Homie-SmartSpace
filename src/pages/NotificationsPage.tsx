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

  const severityIcons: Record<NotificationSeverity, React.ReactNode> = {
    info: <Info className="h-4 w-4 text-accent" />,
    success: <CheckCircle className="h-4 w-4 text-success" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning" />,
    danger: <AlertCircle className="h-4 w-4 text-danger" />,
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text">Notifications</h1>
            {unreadCount > 0 ? (
              <span
                aria-live="polite"
                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent text-white"
              >
                {unreadCount} unread
              </span>
            ) : (
              <span
                aria-live="polite"
                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-surface-subtle border border-border text-text-muted"
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
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus-ring ${
              activeTab === tab.id
                ? 'bg-accent text-white font-semibold shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <Card padding="lg" className="border-dashed bg-surface text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-subtle border border-border flex items-center justify-center mx-auto text-text-muted">
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
          className="space-y-3"
        >
          {filteredNotifications.map((notif: Notification) => (
            <Card
              key={notif.id}
              role="listitem"
              className={`p-4 transition-all duration-200 border ${
                notif.read
                  ? 'bg-surface/60 border-border text-text-muted'
                  : 'bg-surface border-accent/40 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 mt-0.5 p-1 rounded-lg bg-surface-subtle border border-border">
                    {severityIcons[notif.severity]}
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
                      {!notif.read && (
                        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
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
                      <span>{formatRelativeTime(notif.timestamp)}</span>
                      {notif.link && (
                        <Link
                          to={notif.link}
                          className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
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
                      className="text-xs p-1.5"
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
                    className="text-xs p-1.5 text-text-muted hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default NotificationsPage;
