/**
 * Notification Management & Deduplication Engine.
 * Pure TypeScript. Zero React imports.
 *
 * Guarantees:
 * - Deterministic deduplication key generation per (category + targetId/condition).
 * - Cooldown suppression using injected virtual Clock.
 * - Ongoing condition tracking: raises exactly one notification until the condition clears.
 * - Read/unread status management and badge counter calculations.
 * - Injected store accessor ensuring state lives in the store across component remounts.
 */

import type { Notification, NotificationCategory, NotificationSeverity } from '@/types';
import type { Clock } from './interfaces';

export interface NotificationStoreAccessor {
  getState: () => {
    notifications: Notification[];
    lastNotifiedTimestamps: Record<string, number>;
    activeConditions: Record<string, boolean>;
    notificationSettings?: {
      cooldownMinutes: number;
      toastCategories: NotificationCategory[];
    };
    addNotification: (notification: Notification) => void;
    addToast?: (toast: { id: string; title: string; message?: string; severity: NotificationSeverity }) => void;
    recordNotificationTimestamp: (key: string, timestamp: number) => void;
    setActiveCondition: (key: string, active: boolean) => void;
    clearActiveCondition: (key: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
  };
}

export interface NotificationDeps {
  clock: Clock;
  store: NotificationStoreAccessor;
}

export interface NotificationInput {
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  link?: string;
}

export interface PublishNotificationOptions {
  /** Target device ID or condition identifier */
  targetId?: string;
  /** Custom condition key (e.g. 'temp_high') */
  conditionKey?: string;
  /** Cooldown duration in milliseconds (default: 300,000 ms / 5 minutes) */
  cooldownMs?: number;
  /** Whether this notification represents an ongoing condition that stays active until cleared */
  isOngoing?: boolean;
}

export interface NotificationPublishResult {
  published: boolean;
  notificationId?: string;
  reason?: 'cooldown_active' | 'ongoing_condition_already_active';
}

let notificationSequenceCounter = 1;

/**
 * Builds a deterministic deduplication key for a category and target/condition.
 */
export function getNotificationDedupeKey(
  category: NotificationCategory,
  targetIdOrCondition: string
): string {
  return `${category}:${targetIdOrCondition}`;
}

/**
 * Publishes a notification into the store hub with strict deduplication and cooldown controls.
 */
export function publishNotification(
  deps: NotificationDeps,
  input: NotificationInput,
  options: PublishNotificationOptions = {}
): NotificationPublishResult {
  const target =
    options.conditionKey ?? options.targetId ?? input.title.toLowerCase().replace(/\s+/g, '-');
  const dedupeKey = getNotificationDedupeKey(input.category, target);
  const now = deps.clock.now();
  const state = deps.store.getState();

  // 1. Ongoing condition check: ongoing condition raises exactly one notification until cleared
  if (options.isOngoing) {
    if (state.activeConditions[dedupeKey]) {
      return {
        published: false,
        reason: 'ongoing_condition_already_active',
      };
    }
  }

  // 2. Cooldown check: suppress identical notifications within cooldown interval
  const defaultCooldownMs = (state.notificationSettings?.cooldownMinutes ?? 5) * 60 * 1000;
  const cooldownMs = options.cooldownMs ?? defaultCooldownMs;
  const lastTime = state.lastNotifiedTimestamps[dedupeKey];
  if (lastTime !== undefined && now - lastTime < cooldownMs) {
    return {
      published: false,
      reason: 'cooldown_active',
    };
  }

  // 3. Mark ongoing condition active if specified
  if (options.isOngoing) {
    state.setActiveCondition(dedupeKey, true);
  }

  // 4. Update last notified timestamp in the store
  state.recordNotificationTimestamp(dedupeKey, now);

  // 5. Append new notification to store
  const id = `notif-${now}-${notificationSequenceCounter++}`;
  const notification: Notification = {
    id,
    timestamp: now,
    title: input.title,
    message: input.message,
    category: input.category,
    severity: input.severity,
    read: false,
    link: input.link,
  };

  state.addNotification(notification);

  // 6. Conditionally raise live toast according to user category preferences
  if (state.addToast) {
    const toastCats = state.notificationSettings?.toastCategories ?? [
      'device',
      'security',
      'energy',
      'system',
      'automation',
    ];
    if (toastCats.includes(input.category)) {
      state.addToast({
        id: `toast-${id}`,
        title: input.title,
        message: input.message,
        severity: input.severity,
      });
    }
  }

  return {
    published: true,
    notificationId: id,
  };
}

/**
 * Clears an ongoing condition state, allowing subsequent triggers to notify again.
 */
export function clearOngoingCondition(
  deps: NotificationDeps,
  category: NotificationCategory,
  targetIdOrCondition: string
): void {
  const dedupeKey = getNotificationDedupeKey(category, targetIdOrCondition);
  deps.store.getState().clearActiveCondition(dedupeKey);
}

/**
 * Marks a single notification as read by ID.
 */
export function markRead(
  id: string,
  store: NotificationStoreAccessor
): void {
  store.getState().markAsRead(id);
}

/**
 * Marks all notifications in the hub as read.
 */
export function markAllRead(store: NotificationStoreAccessor): void {
  store.getState().markAllAsRead();
}

/**
 * Pure calculation of unread notifications count.
 */
export function unreadCount(notifications: readonly Notification[]): number {
  return notifications.filter((n) => !n.read).length;
}

