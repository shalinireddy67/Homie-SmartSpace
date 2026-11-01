/**
 * Central Simulation Engine.
 * Pure TypeScript. Zero React imports.
 * Drives environmental telemetry drift, power calculation, anomaly generation,
 * and online/offline transitions deterministically via PRNG and injectable dependencies.
 */

import type { Device, Room, LivePowerReading, EnergyAnomaly } from '@/types';
import type { StoreAccessor } from './commands';
import { computeDevicePowerWatts } from './commands';
import { PRNG } from '@/utils/prng';
import type { Clock, Scheduler } from './interfaces';

export interface SimulationEngineOptions {
  store: StoreAccessor;
  clock: Clock;
  scheduler: Scheduler;
  prng?: PRNG;
  tickIntervalMs?: number;
}

export type SimulationListener = (telemetry: LivePowerReading) => void;

export class SimulationEngine {
  private store: StoreAccessor;
  private clock: Clock;
  private scheduler: Scheduler;
  private prng: PRNG;
  private tickIntervalMs: number;
  private timerHandle: unknown = null;
  private listeners: Set<SimulationListener> = new Set();
  private stepCount = 0;

  constructor(options: SimulationEngineOptions) {
    this.store = options.store;
    this.clock = options.clock;
    this.scheduler = options.scheduler;
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;

    const seed = this.store.getState().seed || 4242;
    this.prng = options.prng || new PRNG(seed);
  }

  /**
   * Returns current clock instance
   */
  getClock(): Clock {
    return this.clock;
  }

  /**
   * Idempotent start: calling twice creates exactly one active timer.
   */
  start(): void {
    if (this.timerHandle !== null) {
      return;
    }

    this.store.getState().setRunning(true);
    this.timerHandle = this.scheduler.setInterval(() => {
      const speed = this.store.getState().speed;
      const virtualDtMs = this.tickIntervalMs * speed;
      this.step(virtualDtMs);
    }, this.tickIntervalMs);
  }

  /**
   * Stops simulation and cleans up active timer.
   */
  stop(): void {
    if (this.timerHandle !== null) {
      this.scheduler.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.store.getState().setRunning(false);
  }

  /**
   * Exposes active timer count for test verification (0 or 1).
   */
  getTimerCount(): number {
    return this.timerHandle !== null ? 1 : 0;
  }

  /**
   * Changes simulation speed. Controls virtual time advance rate, not real tick rate.
   */
  setSpeed(speed: 1 | 2 | 5 | 10): void {
    this.store.getState().setSpeed(speed);
  }

  /**
   * Executes a single deterministic simulation step.
   * Can be directly invoked in tests without timers.
   */
  step(virtualDtMs: number): LivePowerReading {
    this.stepCount++;
    const state = this.store.getState();

    // 1. Advance virtual time
    const newVirtualTime = state.virtualTime + virtualDtMs;
    this.store.getState().setVirtualTime(newVirtualTime);

    // 2. Update indoor temperature & humidity drift per room
    const currentRooms = state.rooms;
    const currentDevices = state.devices;

    const updatedRooms: Room[] = currentRooms.map((room) => {
      // Find online thermostat in this room
      const roomThermostat = currentDevices.find(
        (d) => d.roomId === room.id && d.type === 'thermostat' && d.online
      );

      let ambientTemp = room.ambientTemp ?? 21.0;
      let ambientHumidity = room.ambientHumidity ?? 50.0;

      if (roomThermostat && roomThermostat.type === 'thermostat') {
        const target = roomThermostat.target;
        // Thermal inertia: gradual drift towards thermostat target
        const driftRate = 0.02 * (virtualDtMs / 1000);
        const delta = target - ambientTemp;
        ambientTemp = Math.round((ambientTemp + delta * driftRate) * 100) / 100;
      } else {
        // Natural slight oscillation towards ambient equilibrium (20.5°C)
        const naturalEquilibrium = 20.5;
        const delta = naturalEquilibrium - ambientTemp;
        ambientTemp = Math.round((ambientTemp + delta * 0.005 * (virtualDtMs / 1000)) * 100) / 100;
      }

      // Humidity fluctuation: bounded strictly between 20% and 80%
      const humDelta = this.prng.float(-0.15, 0.15) * (virtualDtMs / 1000);
      ambientHumidity = Math.min(80, Math.max(20, Math.round((ambientHumidity + humDelta) * 10) / 10));

      return {
        ...room,
        ambientTemp,
        ambientHumidity,
      };
    });

    this.store.getState().setRooms(updatedRooms);

    // 3. Update device states (thermostats sync current reading, power recomputed)
    let updatedDevices: Device[] = currentDevices.map((dev) => {
      if (dev.type === 'thermostat') {
        const room = updatedRooms.find((r) => r.id === dev.roomId);
        const current =
          room && room.ambientTemp !== undefined ? room.ambientTemp : dev.current;
        const therm: Device = {
          ...dev,
          current,
          powerWatts: computeDevicePowerWatts({ ...dev, current }),
        };
        return therm;
      }

      const updated: Device = {
        ...dev,
        powerWatts: computeDevicePowerWatts(dev),
      };
      return updated;
    });

    // 4. Occasional reproducible device online/offline toggle (seeded)
    // Runs deterministically every 250 steps with a low pseudo-random check
    if (this.stepCount % 250 === 0 && this.prng.next() < 0.3) {
      const target = this.prng.pick(updatedDevices);
      const isBecomingOffline = target.online;

      updatedDevices = updatedDevices.map((d) => {
        if (d.id === target.id) {
          return {
            ...d,
            online: !isBecomingOffline,
            offlineReason: isBecomingOffline ? 'Simulated ping timeout' : undefined,
            powerWatts: isBecomingOffline ? 0 : computeDevicePowerWatts({ ...d, online: true }),
          } as Device;
        }
        return d;
      });

      this.store.getState().addEvent({
        id: `evt-net-${newVirtualTime}-${target.id}`,
        timestamp: newVirtualTime,
        type: 'system',
        severity: isBecomingOffline ? 'warning' : 'info',
        deviceId: target.id,
        roomId: target.roomId,
        description: `${target.name} ${isBecomingOffline ? 'went offline (ping timeout)' : 'reconnected to mesh network'}`,
      });
    }

    this.store.getState().setDevices(updatedDevices);

    // 5. Calculate telemetry (per-room and total watts)
    // Offline devices draw 0 W. Total watts equals sum of online device powerWatts.
    let totalWatts = 0;
    const roomWatts: Record<string, number> = {};
    const deviceWatts: Record<string, number> = {};

    for (const r of updatedRooms) {
      roomWatts[r.id] = 0;
    }

    for (const dev of updatedDevices) {
      const devWatts = dev.online ? dev.powerWatts : 0;
      deviceWatts[dev.id] = devWatts;
      totalWatts += devWatts;
      roomWatts[dev.roomId] = (roomWatts[dev.roomId] ?? 0) + devWatts;
    }

    // 6. Occasional reproducible sensor anomaly (seeded)
    if (this.stepCount % 120 === 0 && this.prng.next() < 0.25) {
      const spikeWatts = Math.round(totalWatts * 1.8 + this.prng.int(400, 800));
      const anomaly: EnergyAnomaly = {
        id: `anom-${newVirtualTime}`,
        timestamp: newVirtualTime,
        actualWatts: spikeWatts,
        baselineWatts: totalWatts,
        severity: 'high',
        description: `Unusual consumption spike detected (+${spikeWatts - totalWatts} W)`,
      };
      this.store.getState().addAnomaly(anomaly);

      this.store.getState().addEvent({
        id: `evt-anom-${newVirtualTime}`,
        timestamp: newVirtualTime,
        type: 'energy',
        severity: 'alert',
        description: anomaly.description,
        details: {
          actualWatts: spikeWatts,
          baselineWatts: totalWatts,
        },
      });
    }

    // 7. Push bounded telemetry reading into energySlice
    const telemetryReading: LivePowerReading = {
      timestamp: newVirtualTime,
      totalWatts: isNaN(totalWatts) ? 0 : totalWatts,
      roomWatts,
      deviceWatts,
    };

    this.store.getState().appendLiveTelemetry(telemetryReading);

    // 8. Notify subscribers
    for (const listener of this.listeners) {
      try {
        listener(telemetryReading);
      } catch {
        // Listener errors should not break simulation loop
      }
    }

    return telemetryReading;
  }

  /**
   * Subscribes to live step telemetry readings. Returns an unsubscribe function.
   */
  subscribe(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
