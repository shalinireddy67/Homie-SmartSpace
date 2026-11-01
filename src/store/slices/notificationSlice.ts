import { StateCreator } from 'zustand';
import type { Notification, Toast } from '@/types';

/** Maximum notifications retained in persistent hub */
export const MAX_NOTIFICATIONS = 200;

/** Maximum concurrent active ephemeral toasts */
export const MAX_TOASTS = 5;

export interface NotificationSlice {
  notifications: Notification[];
  toasts: Toast[];
  lastNotifiedTimestamps: Record<string, number>;

  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;

  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  recordNotificationTimestamp: (key: string, timestamp: number) => void;
}

export const createNotificationSlice: StateCreator<
  NotificationSlice,
  [],
  [],
  NotificationSlice
> = (set) => ({
  notifications: [],
  toasts: [],
  lastNotifiedTimestamps: {},

  setNotifications: (notifications) =>
    set({
      notifications: notifications.slice(0, MAX_NOTIFICATIONS),
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS
      ),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  addToast: (toast) =>
    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, MAX_TOASTS),
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  recordNotificationTimestamp: (key, timestamp) =>
    set((state) => ({
      lastNotifiedTimestamps: {
        ...state.lastNotifiedTimestamps,
        [key]: timestamp,
      },
    })),
});
