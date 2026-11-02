/**
 * Central Runtime Engine.
 * Pure TypeScript. Zero React imports.
 *
 * Coordinates and composes the execution lifecycle on every tick:
 * 1. Physical Simulation Engine step (temperature drift, bounds, power, anomalies, dropouts).
 * 2. Due schedule evaluation & dispatch (runDueSchedules).
 * 3. Immutable snapshot construction & automation execution (runAutomations with loop guard).
 * 4. High-efficiency incremental anomaly detection on live telemetry.
 * 5. Notification & Event logging policies (online/offline transitions, extreme thresholds, anomaly alerts).
 * 6. Idempotent Strict Mode-safe start/stop lifecycle.
 * 7. Boot-time deterministic demo energy seeding.
 */

import type { LivePowerReading, EnergyAnomaly, Device } from '@/types';
import type { Clock, Scheduler, StoreAccessor } from './interfaces';
import { PRNG } from '@/utils/prng';
import { SimulationEngine } from './simulation';
import { runDueSchedules } from './schedules';
import { runAutomations, type RuleExecutionState } from './automation';
import { detectAnomalies } from './energy';
import {
  publishNotification,
  clearOngoingCondition,
} from './notifications';
import { generateDemoEnergyHistory } from './energy';

export interface RuntimeDeps {
  store: StoreAccessor;
  clock: Clock;
  scheduler: Scheduler;
  prng?: PRNG;
  baseIntervalMs?: number;
}

export interface Runtime {
  start: () => void;
  stop: () => void;
  step: (dtMs?: number) => Promise<void>;
  isRunning: () => boolean;
  getTimerCount: () => number;
  initDemoEnergy: () => void;
}

export function createRuntime(deps: RuntimeDeps): Runtime {
  const { store, clock, scheduler } = deps;
  const prng = deps.prng ?? new PRNG(store.getState().seed ?? 4242);
  const baseIntervalMs = deps.baseIntervalMs ?? 1000;

  // 1. Instantiate the physical simulation engine
  const simulation = new SimulationEngine({ store, clock, scheduler, prng });

  let cancelTimer: (() => void) | null = null;
  let running = false;
  let isExecutingTick = false;

  // Incremental tracking state
  let lastEvaluatedTelemetryLength = 0;
  const previousDeviceOnlineMap = new Map<string, boolean>();
  const ruleStates = new Map<string, RuleExecutionState>();

  // Initialize previous online states from current store
  for (const d of store.getState().devices) {
    previousDeviceOnlineMap.set(d.id, d.online);
  }

  /**
   * Seeds demo energy history covering up to 30 days into the store if empty.
   */
  function initDemoEnergy(): void {
    const state = store.getState();
    if (!state.demoHistory || state.demoHistory.length === 0) {
      const now = clock.now();
      const seed = state.seed ?? 4242;

      // 1. Prior 29 days at 15-minute resolution
      const olderHistory = generateDemoEnergyHistory(
        seed,
        now - 30 * 24 * 3600 * 1000,
        now - 24 * 3600 * 1000,
        15 * 60 * 1000,
        state.devices,
        state.rooms
      );

      // 2. Recent 24 hours at 1-minute resolution (contains known evaluation anomalies)
      const recentHistory = generateDemoEnergyHistory(
        seed + 77,
        now - 24 * 3600 * 1000 + 60 * 1000,
        now,
        60 * 1000,
        state.devices,
        state.rooms
      );

      const combinedHistory = [...olderHistory, ...recentHistory];
      state.setDemoHistory?.(combinedHistory);

      // Seed initial detected anomalies into state.anomalies
      if (state.anomalies.length === 0) {
        const detected = detectAnomalies(
          recentHistory.map((p) => ({ timestamp: p.timestamp, value: p.totalWatts })),
          { metric: 'watts', stdFloor: 10.0 }
        );

        for (const anom of detected) {
          state.addAnomaly?.({
            id: `anom-${anom.timestamp}`,
            timestamp: anom.timestamp,
            actualWatts: anom.value,
            baselineWatts: anom.baseline,
            severity: anom.value > 1500 ? 'critical' : 'high',
            description: `Power spike detected: ${anom.value}W (Baseline: ${anom.baseline}W, Threshold: ${anom.threshold}W)`,
          });
        }
      }
    }
  }

  /**
   * Executes a single discrete runtime tick.
   */
  async function tick(customDtMs?: number): Promise<void> {
    if (isExecutingTick) return;
    isExecutingTick = true;

    try {
      const state = store.getState();
      const speed = state.speed ?? 1;
      const stepDt = customDtMs ?? baseIntervalMs * speed;

      // 1. Simulation Step
      simulation.step(stepDt);

      // 2. Run Due Schedules
      await runDueSchedules({ clock, store, scheduler, prng });

      // 3. Build immutable read-only snapshot
      const currentDevices = store.getState().devices;
      const now = clock.now();
      const totalWatts = currentDevices
        .filter((d: Device) => d.online)
        .reduce((acc: number, d: Device) => acc + (d.powerWatts || 0), 0);

      // 4. Run Automations (causedByAutomation is enforced on all dispatched commands)
      await runAutomations({
        store,
        clock,
        scheduler,
        ruleStates,
      });

      // 5. Incremental Anomaly Detection on Live Telemetry
      const liveTelemetry = store.getState().liveTelemetry;
      if (liveTelemetry.length > lastEvaluatedTelemetryLength) {
        const newReadings = liveTelemetry.slice(lastEvaluatedTelemetryLength);
        lastEvaluatedTelemetryLength = liveTelemetry.length;

        // Take a trailing sample window for reliable statistical context
        const contextWindow = liveTelemetry.slice(
          Math.max(0, liveTelemetry.length - 30)
        );
        const series = contextWindow.map((r: LivePowerReading) => ({
          timestamp: r.timestamp,
          value: r.totalWatts,
        }));

        const detected = detectAnomalies(series, {
          window: 24,
          minSamples: 8,
          k: 3,
          metric: 'watts',
        });

        // Check if any of the detected anomalies correspond to the newly arrived points
        const newTimestamps = new Set(newReadings.map((r: LivePowerReading) => r.timestamp));
        for (const anom of detected) {
          if (newTimestamps.has(anom.timestamp)) {
            const anomalyRecord: EnergyAnomaly = {
              id: `anom-${anom.timestamp}`,
              timestamp: anom.timestamp,
              actualWatts: anom.value,
              baselineWatts: anom.baseline,
              severity: anom.value > anom.baseline * 2 ? 'high' : 'medium',
              description: `Power surge detected: ${anom.value}W (expected baseline: ${anom.baseline}W)`,
            };

            store.getState().addAnomaly?.(anomalyRecord);

            // Emit notification with cooldown
            publishNotification(
              { clock, store },
              {
                title: 'Power Surge Anomaly',
                message: anomalyRecord.description,
                category: 'energy',
                severity: 'warning',
              },
              {
                conditionKey: 'energy_anomaly',
                cooldownMs: 300000,
              }
            );
          }
        }
      }

      // 6. Device Online / Offline Transition Notifications & Events
      for (const dev of currentDevices) {
        const wasOnline = previousDeviceOnlineMap.get(dev.id);
        if (wasOnline !== undefined && wasOnline !== dev.online) {
          if (!dev.online) {
            // Device went offline -> clear any active online condition and publish offline alert
            clearOngoingCondition({ clock, store }, 'device', `online:${dev.id}`);

            publishNotification(
              { clock, store },
              {
                title: `Device Offline: ${dev.name}`,
                message: dev.offlineReason ?? 'Connection lost / ping timeout',
                category: 'device',
                severity: 'warning',
              },
              {
                conditionKey: `offline:${dev.id}`,
                isOngoing: true,
                cooldownMs: 60000,
              }
            );

            store.getState().addEvent({
              id: `evt-offline-${now}-${dev.id}`,
              timestamp: now,
              type: 'device_state',
              severity: 'warning',
              deviceId: dev.id,
              roomId: dev.roomId,
              description: `${dev.name} went offline: ${dev.offlineReason ?? 'Ping timeout'}`,
            });
          } else {
            // Device came back online -> clear ongoing offline condition and publish online notice
            clearOngoingCondition({ clock, store }, 'device', `offline:${dev.id}`);

            publishNotification(
              { clock, store },
              {
                title: `Device Online: ${dev.name}`,
                message: 'Device re-established network connection',
                category: 'device',
                severity: 'info',
              },
              {
                conditionKey: `online:${dev.id}`,
                cooldownMs: 60000,
              }
            );

            store.getState().addEvent({
              id: `evt-online-${now}-${dev.id}`,
              timestamp: now,
              type: 'device_state',
              severity: 'info',
              deviceId: dev.id,
              roomId: dev.roomId,
              description: `${dev.name} reconnected online`,
            });
          }

          previousDeviceOnlineMap.set(dev.id, dev.online);
        } else if (wasOnline === undefined) {
          previousDeviceOnlineMap.set(dev.id, dev.online);
        }
      }

      // 7. Sensor Ongoing Conditions (Extreme Temperature & Total Power Spikes)
      for (const dev of currentDevices) {
        if (dev.type === 'thermostat' && dev.online) {
          const tempKey = `temp_out_of_range:${dev.id}`;
          if (dev.current > 30 || dev.current < 16) {
            publishNotification(
              { clock, store },
              {
                title: `Extreme Temperature: ${dev.name}`,
                message: `Current temperature ${dev.current}°C is outside normal comfort envelope (16°C–30°C)`,
                category: 'device',
                severity: 'warning',
              },
              {
                conditionKey: tempKey,
                isOngoing: true,
                cooldownMs: 120000,
              }
            );
          } else {
            clearOngoingCondition({ clock, store }, 'device', tempKey);
          }
        }
      }

      // Power threshold ongoing alert (> 3500W)
      const powerSpikeKey = 'power_spike_high';
      if (totalWatts > 3500) {
        publishNotification(
          { clock, store },
          {
            title: 'High Aggregate Power Draw',
            message: `Total household consumption reached ${totalWatts}W`,
            category: 'energy',
            severity: 'warning',
          },
          {
            conditionKey: powerSpikeKey,
            isOngoing: true,
            cooldownMs: 300000,
          }
        );
      } else {
        clearOngoingCondition({ clock, store }, 'energy', powerSpikeKey);
      }
    } finally {
      isExecutingTick = false;
    }
  }

  function start(): void {
    if (running) return;
    running = true;
    store.getState().setRunning(true);

    // Initial demo energy boot seeding
    initDemoEnergy();

    if (scheduler.scheduleRepeating) {
      cancelTimer = scheduler.scheduleRepeating(async () => {
        if (store.getState().running) {
          await tick();
        }
      }, baseIntervalMs);
    } else {
      const handle = scheduler.setInterval(async () => {
        if (store.getState().running) {
          await tick();
        }
      }, baseIntervalMs);
      cancelTimer = () => scheduler.clearInterval(handle);
    }
  }

  function stop(): void {
    if (!running && cancelTimer === null) return;
    running = false;
    store.getState().setRunning(false);

    if (cancelTimer) {
      cancelTimer();
      cancelTimer = null;
    }
  }

  return {
    start,
    stop,
    step: async (dtMs?: number) => {
      await tick(dtMs);
    },
    isRunning: () => running,
    getTimerCount: () => (cancelTimer !== null ? 1 : 0),
    initDemoEnergy,
  };
}
