import { describe, it, expect, beforeEach } from 'vitest';
import {
  publishNotification,
  clearOngoingCondition,
  markRead,
  markAllRead,
  unreadCount,
  type NotificationDeps,
} from '@/engine/notifications';
import { useStore } from '@/store';
import { savePersistedState, loadPersistedState, type PersistedStateV1 } from '@/store/storage';
import type { Clock } from '@/engine/interfaces';

class VirtualClock implements Clock {
  constructor(private time = 1730476800000) {}
  now(): number {
    return this.time;
  }
  advance(ms: number): void {
    this.time += ms;
  }
  set(time: number): void {
    this.time = time;
  }
}

describe('Notification Engine & Deduplication', () => {
  let clock: VirtualClock;
  let deps: NotificationDeps;

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().resetToDefaults();
    useStore.getState().setNotifications([]);

    clock = new VirtualClock(1730476800000);
    deps = {
      clock,
      store: useStore,
    };
  });

  it('repeat inside cooldown gives one: suppresses second notification within cooldown', () => {
    // First notification
    const res1 = publishNotification(
      deps,
      {
        title: 'High Temperature Detected',
        message: 'Living room temperature exceeded 28°C',
        category: 'device',
        severity: 'warning',
      },
      { targetId: 'dev-therm-living', cooldownMs: 60000 }
    );

    expect(res1.published).toBe(true);
    expect(res1.notificationId).toBeDefined();
    expect(useStore.getState().notifications).toHaveLength(1);

    // Second notification 30 seconds later (within 60s cooldown)
    clock.advance(30000);
    const res2 = publishNotification(
      deps,
      {
        title: 'High Temperature Detected',
        message: 'Living room temperature exceeded 28°C',
        category: 'device',
        severity: 'warning',
      },
      { targetId: 'dev-therm-living', cooldownMs: 60000 }
    );

    expect(res2.published).toBe(false);
    expect(res2.reason).toBe('cooldown_active');
    expect(useStore.getState().notifications).toHaveLength(1);
  });

  it('after cooldown gives two: allows second notification once cooldown expires', () => {
    // First notification
    publishNotification(
      deps,
      {
        title: 'Front Door Left Unlocked',
        message: 'Door deadbolt has been open for 10 minutes',
        category: 'security',
        severity: 'danger',
      },
      { targetId: 'dev-lock-front', cooldownMs: 60000 }
    );

    expect(useStore.getState().notifications).toHaveLength(1);

    // Advance clock past cooldown (65 seconds later)
    clock.advance(65000);

    const res2 = publishNotification(
      deps,
      {
        title: 'Front Door Left Unlocked',
        message: 'Door deadbolt has been open for 10 minutes',
        category: 'security',
        severity: 'danger',
      },
      { targetId: 'dev-lock-front', cooldownMs: 60000 }
    );

    expect(res2.published).toBe(true);
    expect(useStore.getState().notifications).toHaveLength(2);
  });

  it('different devices both pass: different target IDs are tracked independently', () => {
    const res1 = publishNotification(
      deps,
      {
        title: 'Device Offline',
        message: 'Device lost ping response',
        category: 'device',
        severity: 'warning',
      },
      { targetId: 'dev-light-bed', cooldownMs: 60000 }
    );

    const res2 = publishNotification(
      deps,
      {
        title: 'Device Offline',
        message: 'Device lost ping response',
        category: 'device',
        severity: 'warning',
      },
      { targetId: 'dev-light-living', cooldownMs: 60000 }
    );

    expect(res1.published).toBe(true);
    expect(res2.published).toBe(true);
    expect(useStore.getState().notifications).toHaveLength(2);
  });

  it('ongoing condition raises one notification until it clears', () => {
    const spec = {
      title: 'Water Leak Sensor Alert',
      message: 'Moisture detected under bathroom sink',
      category: 'device' as const,
      severity: 'danger' as const,
    };

    // First trigger of ongoing condition
    const res1 = publishNotification(deps, spec, {
      conditionKey: 'leak_bath',
      isOngoing: true,
      cooldownMs: 1000,
    });
    expect(res1.published).toBe(true);
    expect(useStore.getState().notifications).toHaveLength(1);

    // Advance clock past cooldown interval, but condition is still active
    clock.advance(10000);
    const res2 = publishNotification(deps, spec, {
      conditionKey: 'leak_bath',
      isOngoing: true,
      cooldownMs: 1000,
    });
    expect(res2.published).toBe(false);
    expect(res2.reason).toBe('ongoing_condition_already_active');
    expect(useStore.getState().notifications).toHaveLength(1);

    // Clear the condition
    clearOngoingCondition(deps, 'device', 'leak_bath');

    // Trigger again after condition clears -> now it notifies
    clock.advance(10000);
    const res3 = publishNotification(deps, spec, {
      conditionKey: 'leak_bath',
      isOngoing: true,
      cooldownMs: 1000,
    });
    expect(res3.published).toBe(true);
    expect(useStore.getState().notifications).toHaveLength(2);
  });

  it('state lives in store so remount does not re-raise within cooldown', () => {
    // Initial component mounts with deps
    publishNotification(
      deps,
      {
        title: 'High Power Spike',
        message: 'Main breaker exceeded 3500W',
        category: 'energy',
        severity: 'warning',
      },
      { conditionKey: 'power_spike_high', cooldownMs: 120000 }
    );

    expect(useStore.getState().notifications).toHaveLength(1);

    // Component unmounts and remounts: a fresh deps object is constructed with a new clock instance at same time
    const newRemountedDeps: NotificationDeps = {
      clock: new VirtualClock(clock.now() + 30000), // 30s later (inside 120s cooldown)
      store: useStore, // points to shared central store
    };

    const resRemount = publishNotification(
      newRemountedDeps,
      {
        title: 'High Power Spike',
        message: 'Main breaker exceeded 3500W',
        category: 'energy',
        severity: 'warning',
      },
      { conditionKey: 'power_spike_high', cooldownMs: 120000 }
    );

    expect(resRemount.published).toBe(false);
    expect(resRemount.reason).toBe('cooldown_active');
    expect(useStore.getState().notifications).toHaveLength(1);
  });

  it('read state survives save and load', () => {
    const res = publishNotification(
      deps,
      {
        title: 'Firmware Update',
        message: 'Version 2.4.0 installed successfully',
        category: 'system',
        severity: 'info',
      },
      { conditionKey: 'firmware_updated' }
    );

    expect(res.published).toBe(true);
    const notifId = res.notificationId!;
    expect(unreadCount(useStore.getState().notifications)).toBe(1);

    // Mark as read
    markRead(notifId, useStore);
    expect(unreadCount(useStore.getState().notifications)).toBe(0);

    // Save persisted state to localStorage
    const snapshot: PersistedStateV1 = {
      version: 1,
      notifications: useStore.getState().notifications,
      devices: useStore.getState().devices,
      rules: useStore.getState().rules,
      schedules: useStore.getState().schedules,
      simulation: {
        speed: 1,
        seed: 1234,
        failNextCommand: false,
        failureProbability: 0,
      },
      theme: 'dark',
    };
    savePersistedState(snapshot);

    // Reset store memory state to empty
    useStore.getState().setNotifications([]);
    expect(useStore.getState().notifications).toHaveLength(0);

    // Load persisted state back
    const loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded?.notifications).toHaveLength(1);
    expect(loaded?.notifications?.[0]?.id).toBe(notifId);
    expect(loaded?.notifications?.[0]?.read).toBe(true);
    expect(unreadCount(loaded?.notifications ?? [])).toBe(0);
  });

  it('marks all as read and calculates accurate unread count', () => {
    publishNotification(
      deps,
      { title: 'A', message: 'A', category: 'system', severity: 'info' },
      { conditionKey: 'a', cooldownMs: 0 }
    );
    clock.advance(10);
    publishNotification(
      deps,
      { title: 'B', message: 'B', category: 'system', severity: 'info' },
      { conditionKey: 'b', cooldownMs: 0 }
    );

    expect(unreadCount(useStore.getState().notifications)).toBe(2);

    markAllRead(useStore);
    expect(unreadCount(useStore.getState().notifications)).toBe(0);
  });
});
