import { PRNG } from './prng';
import type {
  Room,
  Device,
  LightDevice,
  ThermostatDevice,
  LockDevice,
  CameraDevice,
  Rule,
  Schedule,
  LogEvent,
  EventType,
  EventSeverity,
  LivePowerReading,
} from '@/types';

export interface SeedDataResult {
  rooms: Room[];
  devices: Device[];
  rules: Rule[];
  schedules: Schedule[];
  events: LogEvent[];
  initialTelemetry: LivePowerReading[];
}

export function generateSeedData(seed: number, anchorTime: number): SeedDataResult {
  const prng = new PRNG(seed);

  // 1. Five Rooms
  const rooms: Room[] = [
    {
      id: 'room-living',
      name: 'Living Room',
      description: 'Main ground-floor living area with entertainment center.',
      floor: 1,
      targetTemp: 72,
      ambientTemp: 71.5,
      ambientHumidity: 45,
    },
    {
      id: 'room-bedroom',
      name: 'Primary Bedroom',
      description: 'Second-floor primary suite.',
      floor: 2,
      targetTemp: 68,
      ambientTemp: 68.2,
      ambientHumidity: 48,
    },
    {
      id: 'room-kitchen',
      name: 'Kitchen',
      description: 'Open-concept culinary space with smart appliances.',
      floor: 1,
      targetTemp: 70,
      ambientTemp: 72.1,
      ambientHumidity: 52,
    },
    {
      id: 'room-bathroom',
      name: 'Ensuite Bathroom',
      description: 'Upper-level bath with radiant underfloor heating.',
      floor: 2,
      targetTemp: 71,
      ambientTemp: 73.0,
      ambientHumidity: 65,
    },
    {
      id: 'room-outdoor',
      name: 'Outdoor Patio',
      description: 'Exterior perimeter, front porch, and backyard deck.',
      floor: 0,
      targetTemp: 65,
      ambientTemp: 62.4,
      ambientHumidity: 60,
    },
  ];

  // 2. 14 Devices (>=2 of each type: Light, Thermostat, Lock, Camera; at least one offline)
  const devices: Device[] = [
    // Lights (4)
    {
      id: 'dev-light-living',
      name: 'Living Room Chandelier',
      roomId: 'room-living',
      type: 'light',
      online: true,
      on: true,
      brightness: 80,
      color: '#ffedd5',
      updatedAt: anchorTime - 3600000,
      powerWatts: 45,
    } as LightDevice,
    {
      id: 'dev-light-kitchen',
      name: 'Kitchen Island Pendants',
      roomId: 'room-kitchen',
      type: 'light',
      online: true,
      on: true,
      brightness: 100,
      color: '#ffffff',
      updatedAt: anchorTime - 1800000,
      powerWatts: 35,
    } as LightDevice,
    {
      id: 'dev-light-bed',
      name: 'Bedroom Nightstand Lamp',
      roomId: 'room-bedroom',
      type: 'light',
      online: true,
      on: false,
      brightness: 30,
      color: '#fef3c7',
      updatedAt: anchorTime - 7200000,
      powerWatts: 0, // Off devices draw ~0 W
    } as LightDevice,
    {
      id: 'dev-light-outdoor',
      name: 'Patio String Lights',
      roomId: 'room-outdoor',
      type: 'light',
      online: true,
      on: false,
      brightness: 60,
      color: '#fef08a',
      updatedAt: anchorTime - 14400000,
      powerWatts: 0, // Off devices draw ~0 W
    } as LightDevice,

    // Thermostats (3)
    {
      id: 'dev-therm-living',
      name: 'Living Room Thermostat',
      roomId: 'room-living',
      type: 'thermostat',
      online: true,
      current: 71.5,
      target: 72,
      min: 60,
      max: 85,
      unit: 'F',
      updatedAt: anchorTime - 900000,
      powerWatts: 380, // Actively heating/cooling
    } as ThermostatDevice,
    {
      id: 'dev-therm-bed',
      name: 'Bedroom Zone Climate',
      roomId: 'room-bedroom',
      type: 'thermostat',
      online: true,
      current: 68.2,
      target: 68,
      min: 60,
      max: 85,
      unit: 'F',
      updatedAt: anchorTime - 1200000,
      powerWatts: 18, // Idle maintenance
    } as ThermostatDevice,
    {
      id: 'dev-therm-bath',
      name: 'Radiant Floor Heating',
      roomId: 'room-bathroom',
      type: 'thermostat',
      online: true,
      current: 73.0,
      target: 72,
      min: 60,
      max: 85,
      unit: 'F',
      updatedAt: anchorTime - 5400000,
      powerWatts: 0, // In standby/holding temp
    } as ThermostatDevice,

    // Locks (3)
    {
      id: 'dev-lock-front',
      name: 'Front Entry Deadbolt',
      roomId: 'room-living',
      type: 'lock',
      online: true,
      locked: true,
      updatedAt: anchorTime - 28800000,
      powerWatts: 2,
    } as LockDevice,
    {
      id: 'dev-lock-back',
      name: 'Patio Sliding Door Lock',
      roomId: 'room-outdoor',
      type: 'lock',
      online: true,
      locked: true,
      updatedAt: anchorTime - 36000000,
      powerWatts: 2,
    } as LockDevice,
    {
      id: 'dev-lock-garage',
      name: 'Garage Access Deadbolt',
      roomId: 'room-kitchen',
      type: 'lock',
      online: true,
      locked: false,
      updatedAt: anchorTime - 1500000,
      powerWatts: 2,
    } as LockDevice,

    // Cameras (4)
    {
      id: 'dev-cam-doorbell',
      name: 'Front Doorbell Camera',
      roomId: 'room-outdoor',
      type: 'camera',
      online: true,
      active: true,
      motionDetection: true,
      privacyMode: false,
      updatedAt: anchorTime - 600000,
      powerWatts: 9,
    } as CameraDevice,
    {
      id: 'dev-cam-backyard',
      name: 'Backyard Perimeter Cam',
      roomId: 'room-outdoor',
      type: 'camera',
      online: true,
      active: true,
      motionDetection: true,
      privacyMode: false,
      updatedAt: anchorTime - 1800000,
      powerWatts: 14,
    } as CameraDevice,
    {
      id: 'dev-cam-driveway',
      name: 'Driveway Security Camera',
      roomId: 'room-outdoor',
      type: 'camera',
      online: true,
      active: false,
      motionDetection: false,
      privacyMode: true,
      updatedAt: anchorTime - 86400000,
      powerWatts: 1,
    } as CameraDevice,
    {
      id: 'dev-cam-patio',
      name: 'Garden Observation Cam',
      roomId: 'room-outdoor',
      type: 'camera',
      online: false, // At least one device starts offline!
      offlineReason: 'Wi-Fi RSSI Timeout (-88 dBm)',
      active: false,
      motionDetection: false,
      privacyMode: false,
      updatedAt: anchorTime - 43200000,
      powerWatts: 0,
    } as CameraDevice,
  ];

  // 3. Sample Automation Rules & Schedules
  const rules: Rule[] = [
    {
      id: 'rule-night-lockdown',
      name: 'Nighttime Perimeter Lockdown',
      description: 'Engages security deadbolts and turns off interior living lights at night.',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: 'c-1',
            field: 'time',
            operator: '>=',
            value: '23:00',
          },
        ],
      },
      actions: [
        {
          id: 'a-1',
          deviceId: 'dev-lock-front',
          field: 'locked',
          value: true,
        },
        {
          id: 'a-2',
          deviceId: 'dev-lock-back',
          field: 'locked',
          value: true,
        },
        {
          id: 'a-3',
          deviceId: 'dev-light-living',
          field: 'on',
          value: false,
        },
      ],
      timeWindow: { start: '23:00', end: '05:00' },
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      cooldownMinutes: 30,
      lastTriggeredAt: anchorTime - 86400000,
      createdAt: anchorTime - 604800000,
      modifiedAt: anchorTime - 604800000,
    },
    {
      id: 'rule-climate-eco',
      name: 'Living Room Cooling Override',
      description: 'Triggers cooling setpoint when ambient room temperature exceeds 75°F.',
      enabled: true,
      conditionGroup: {
        logic: 'AND',
        conditions: [
          {
            id: 'c-2',
            deviceId: 'dev-therm-living',
            field: 'current',
            operator: '>',
            value: 75,
          },
        ],
      },
      actions: [
        {
          id: 'a-4',
          deviceId: 'dev-therm-living',
          field: 'target',
          value: 71,
        },
      ],
      cooldownMinutes: 15,
      createdAt: anchorTime - 1209600000,
      modifiedAt: anchorTime - 1209600000,
    },
  ];

  const schedules: Schedule[] = [
    {
      id: 'sched-morning-comfort',
      name: 'Weekday Morning Warmup',
      enabled: true,
      deviceId: 'dev-therm-bed',
      action: {
        id: 'sa-1',
        deviceId: 'dev-therm-bed',
        field: 'target',
        value: 70,
      },
      time: '06:30',
      weekdays: [1, 2, 3, 4, 5],
      nextRunTime: anchorTime + 28800000,
      createdAt: anchorTime - 1209600000,
      modifiedAt: anchorTime - 1209600000,
    },
    {
      id: 'sched-evening-ambience',
      name: 'Sunset Living Lighting',
      enabled: true,
      deviceId: 'dev-light-living',
      action: {
        id: 'sa-2',
        deviceId: 'dev-light-living',
        field: 'brightness',
        value: 70,
      },
      time: '18:45',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      nextRunTime: anchorTime + 43200000,
      createdAt: anchorTime - 1209600000,
      modifiedAt: anchorTime - 1209600000,
    },
  ];

  // 4. Generate 10,000+ Unique Events across the last 30 days
  const totalEvents = 10000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const startTime = anchorTime - thirtyDaysMs;

  const events: LogEvent[] = new Array<LogEvent>(totalEvents);

  // Pre-generate random delta offsets to ensure chronological spread
  const timestamps = new Float64Array(totalEvents);
  for (let i = 0; i < totalEvents; i++) {
    timestamps[i] = startTime + prng.float(0, thirtyDaysMs);
  }
  // Sort timestamps for deterministic chronological sequence
  timestamps.sort();

  const eventTemplates = [
    {
      type: 'device_state' as EventType,
      severity: 'info' as EventSeverity,
      desc: 'Brightness setpoint adjusted',
      detailKey: 'brightness',
    },
    {
      type: 'device_state' as EventType,
      severity: 'info' as EventSeverity,
      desc: 'Thermostat reached target temperature',
      detailKey: 'temp',
    },
    {
      type: 'command' as EventType,
      severity: 'success' as EventSeverity,
      desc: 'Remote command executed successfully',
      detailKey: 'latencyMs',
    },
    {
      type: 'command' as EventType,
      severity: 'warning' as EventSeverity,
      desc: 'Command acknowledged with minor latency retry',
      detailKey: 'retryCount',
    },
    {
      type: 'security' as EventType,
      severity: 'info' as EventSeverity,
      desc: 'Deadbolt securely locked',
      detailKey: 'mechanism',
    },
    {
      type: 'security' as EventType,
      severity: 'alert' as EventSeverity,
      desc: 'Perimeter motion triggered surveillance recording',
      detailKey: 'motionConfidence',
    },
    {
      type: 'automation' as EventType,
      severity: 'success' as EventSeverity,
      desc: 'Automation routine evaluated true and executed',
      detailKey: 'ruleTrigger',
    },
    {
      type: 'energy' as EventType,
      severity: 'info' as EventSeverity,
      desc: 'Hourly energy consumption logged',
      detailKey: 'watts',
    },
    {
      type: 'energy' as EventType,
      severity: 'warning' as EventSeverity,
      desc: 'Power draw exceeded 2-sigma rolling baseline',
      detailKey: 'spikeMagnitudeWatts',
    },
    {
      type: 'system' as EventType,
      severity: 'info' as EventSeverity,
      desc: 'Mesh network ping latency verified',
      detailKey: 'rssi',
    },
  ];

  for (let i = 0; i < totalEvents; i++) {
    const ts = Math.round(timestamps[i] ?? (startTime + i * 250000));
    const tmpl = prng.pick(eventTemplates);
    const targetDev = prng.pick(devices);
    const id = `evt-${i + 1}-${ts.toString(36)}`;

    const details: Record<string, string | number | boolean | null> = {
      sequence: i + 1,
      source: prng.boolean(0.7) ? 'engine' : 'user',
    };

    if (tmpl.detailKey === 'brightness') {
      details['brightness'] = prng.int(10, 100);
    } else if (tmpl.detailKey === 'temp') {
      details['temperature'] = prng.int(68, 76);
    } else if (tmpl.detailKey === 'latencyMs') {
      details['latencyMs'] = prng.int(120, 650);
    } else if (tmpl.detailKey === 'watts') {
      details['watts'] = prng.int(50, 1200);
    } else if (tmpl.detailKey === 'spikeMagnitudeWatts') {
      details['spikeWatts'] = prng.int(1800, 3200);
    } else if (tmpl.detailKey === 'rssi') {
      details['rssi'] = -prng.int(45, 85);
    }

    events[i] = {
      id,
      timestamp: ts,
      type: tmpl.type,
      severity: tmpl.severity,
      deviceId: targetDev.id,
      roomId: targetDev.roomId,
      description: `${targetDev.name}: ${tmpl.desc}`,
      details,
    };
  }

  // 5. Initial Telemetry (Ring Buffer Seed)
  const initialTelemetry: LivePowerReading[] = [
    {
      timestamp: anchorTime,
      totalWatts: devices.reduce((sum, d) => sum + d.powerWatts, 0),
      roomWatts: {
        'room-living': 427,
        'room-bedroom': 18,
        'room-kitchen': 37,
        'room-bathroom': 0,
        'room-outdoor': 25,
      },
      deviceWatts: devices.reduce<Record<string, number>>((acc, d) => {
        acc[d.id] = d.powerWatts;
        return acc;
      }, {}),
    },
  ];

  return {
    rooms,
    devices,
    rules,
    schedules,
    events,
    initialTelemetry,
  };
}
