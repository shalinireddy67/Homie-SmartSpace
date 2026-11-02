import { create } from 'zustand';
import { createDeviceSlice, type DeviceSlice } from './slices/deviceSlice';
import { createRoomSlice, type RoomSlice } from './slices/roomSlice';
import {
  createSimulationSlice,
  type SimulationSlice,
} from './slices/simulationSlice';
import {
  createAutomationSlice,
  type AutomationSlice,
} from './slices/automationSlice';
import { createEnergySlice, type EnergySlice } from './slices/energySlice';
import { createEventSlice, type EventSlice } from './slices/eventSlice';
import {
  createNotificationSlice,
  type NotificationSlice,
} from './slices/notificationSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';
import { generateSeedData } from '@/utils/seedData';
import {
  loadPersistedState,
  debouncedSave,
  setupPersistenceListeners,
  type PersistedStateV1,
} from './storage';

export type RootStore = DeviceSlice &
  RoomSlice &
  SimulationSlice &
  AutomationSlice &
  EnergySlice &
  EventSlice &
  NotificationSlice &
  UISlice & {
    resetToDefaults: () => void;
  };

export const useStore = create<RootStore>()((...a) => ({
  ...createDeviceSlice(...a),
  ...createRoomSlice(...a),
  ...createSimulationSlice(...a),
  ...createAutomationSlice(...a),
  ...createEnergySlice(...a),
  ...createEventSlice(...a),
  ...createNotificationSlice(...a),
  ...createUISlice(...a),
  resetToDefaults: () => {
    const seed = 4242;
    const anchorTime = Date.now();
    const freshSeed = generateSeedData(seed, anchorTime);
    const set = a[0];
    set({
      rooms: freshSeed.rooms,
      devices: freshSeed.devices,
      rules: freshSeed.rules,
      schedules: freshSeed.schedules,
      events: freshSeed.events,
      liveTelemetry: freshSeed.initialTelemetry,
      anomalies: [],
      executionHistory: [],
      scheduleExecutions: [],
      demoHistory: [],
      isDemoHistory: false,
      notifications: [],
      toasts: [],
      fieldSequences: {},
      globalSequence: 0,
      seed,
      speed: 1,
      running: false,
      failNextCommand: false,
      failureProbability: 0.05,
      virtualTime: anchorTime,
    });
  },
}));

/**
 * Initializes the store with deterministic seed data and restores user config
 * from LocalStorage if present.
 */
export function initializeStore(initialAnchorTime = Date.now()): void {
  const persisted = loadPersistedState();
  const seed = persisted?.simulation?.seed ?? 4242;
  const seedData = generateSeedData(seed, initialAnchorTime);

  useStore.setState({
    // Rooms & Events are freshly generated (10,000+ events not persisted)
    rooms: seedData.rooms,
    events: seedData.events,
    liveTelemetry: seedData.initialTelemetry,

    // Devices: use persisted user configurations if valid, otherwise seed
    devices:
      persisted?.devices && persisted.devices.length > 0
        ? persisted.devices
        : seedData.devices,

    // Rules & Schedules: use persisted if available
    rules:
      persisted?.rules && persisted.rules.length > 0
        ? persisted.rules
        : seedData.rules,
    schedules:
      persisted?.schedules && persisted.schedules.length > 0
        ? persisted.schedules
        : seedData.schedules,

    // Notifications: restore persisted notifications if available
    notifications: persisted?.notifications ?? [],

    // Simulation settings
    seed,
    speed: persisted?.simulation?.speed ?? 1,
    failNextCommand: persisted?.simulation?.failNextCommand ?? false,
    failureProbability: persisted?.simulation?.failureProbability ?? 0.05,
    virtualTime: initialAnchorTime,
    running: false,

    // UI Theme
    theme: persisted?.theme ?? 'light',
  });

  // Enable automatic persistence subscriptions for user config mutations
  useStore.subscribe((state) => {
    const toPersist: PersistedStateV1 = {
      version: 1,
      devices: state.devices,
      rules: state.rules,
      schedules: state.schedules,
      notifications: state.notifications,
      simulation: {
        speed: state.speed,
        seed: state.seed,
        failNextCommand: state.failNextCommand,
        failureProbability: state.failureProbability,
      },
      theme: state.theme,
    };
    debouncedSave(toPersist);
  });

  // Attach flush listener on browser exit
  setupPersistenceListeners();
}

/* ==========================================================================
   Typed Selectors
   ========================================================================== */

export const selectDevices = (state: RootStore) => state.devices;
export const selectDeviceById = (id: string) => (state: RootStore) =>
  state.devices.find((d) => d.id === id);

export const selectRooms = (state: RootStore) => state.rooms;
export const selectRoomById = (id: string) => (state: RootStore) =>
  state.rooms.find((r) => r.id === id);

export const selectRules = (state: RootStore) => state.rules;
export const selectSchedules = (state: RootStore) => state.schedules;
export const selectExecutions = (state: RootStore) => state.executionHistory;

export const selectSimulation = (state: RootStore) => ({
  running: state.running,
  speed: state.speed,
  seed: state.seed,
  virtualTime: state.virtualTime,
  failNextCommand: state.failNextCommand,
  failureProbability: state.failureProbability,
});

export const selectLiveTelemetry = (state: RootStore) => state.liveTelemetry;
export const selectAnomalies = (state: RootStore) => state.anomalies;
export const selectSelectedTimeRange = (state: RootStore) =>
  state.selectedTimeRange;

export const selectEvents = (state: RootStore) => state.events;
export const selectEventFilter = (state: RootStore) => state.filter;
export const selectSelectedEventId = (state: RootStore) => state.selectedEventId;

export const selectNotifications = (state: RootStore) => state.notifications;
export const selectUnreadCount = (state: RootStore) =>
  state.notifications.filter((n) => !n.read).length;
export const selectToasts = (state: RootStore) => state.toasts;

export const selectTheme = (state: RootStore) => state.theme;
export const selectActiveModal = (state: RootStore) => state.activeModal;

// Re-export typed selectors
export * from './selectors';

