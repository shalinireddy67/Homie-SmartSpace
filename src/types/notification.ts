/**
 * Notification and ephemeral toast domain models.
 */

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export type NotificationCategory =
  | 'device'
  | 'automation'
  | 'security'
  | 'energy'
  | 'system';

export interface Notification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  severity: NotificationSeverity;
  read: boolean;
  category: NotificationCategory;
  link?: string;
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  severity: NotificationSeverity;
  durationMs?: number;
}
