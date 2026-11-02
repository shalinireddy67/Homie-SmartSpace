import { StateCreator } from 'zustand';
import type { Notification, Toast, NotificationSettings } from '@/types';

/** Maximum notifications retained in persistent hub */
export const MAX_NOTIFICATIONS = 200;

/** Maximum concurrent active ephemeral toasts */
export const MAX_TOASTS = 5;

export const defaultNotificationSettings: NotificationSettings = {
  cooldownMinutes: 5,
  toastCategories: ['device', 'security', 'energy', 'system', 'automation'],
};

export interface NotificationSlice {
  notifications: Notification[];
  toasts: Toast[];
  lastNotifiedTimestamps: Record<string, number>;
  activeConditions: Record<string, boolean>;
  notificationSettings: NotificationSettings;

  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;

  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  recordNotificationTimestamp: (key: string, timestamp: number) => void;
  setActiveCondition: (key: string, active: boolean) => void;
  clearActiveCondition: (key: string) => void;
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
  activeConditions: {},
  notificationSettings: defaultNotificationSettings,

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

  setNotificationSettings: (newSettings) =>
    set((state) => ({
      notificationSettings: {
        ...state.notificationSettings,
        ...newSettings,
      },
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

  setActiveCondition: (key, active) =>
    set((state) => ({
      activeConditions: {
        ...state.activeConditions,
        [key]: active,
      },
    })),

  clearActiveCondition: (key) =>
    set((state) => {
      const next = { ...state.activeConditions };
      delete next[key];
      return { activeConditions: next };
    }),
});

