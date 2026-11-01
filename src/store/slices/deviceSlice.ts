import { StateCreator } from 'zustand';
import type { Device, FieldSequenceMap } from '@/types';

export interface DeviceSlice {
  devices: Device[];
  fieldSequences: FieldSequenceMap;
  globalSequence: number;

  setDevices: (devices: Device[]) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  
  // Rollback fencing helpers (per device field)
  nextSequence: (deviceId: string, field: string) => number;
  markField: (deviceId: string, field: string, sequence: number) => void;
  canRollback: (deviceId: string, field: string, sequence: number) => boolean;
}

export const createDeviceSlice: StateCreator<DeviceSlice, [], [], DeviceSlice> = (set, get) => ({
  devices: [],
  fieldSequences: {},
  globalSequence: 0,

  setDevices: (devices) => set({ devices }),

  updateDevice: (deviceId, updates) => {
    set((state) => ({
      devices: state.devices.map((dev) =>
        dev.id === deviceId
          ? ({ ...dev, ...updates, updatedAt: Date.now() } as Device)
          : dev
      ),
    }));
  },

  nextSequence: (deviceId, field) => {
    const nextSeq = get().globalSequence + 1;
    const currentDeviceSeqs = get().fieldSequences[deviceId] ?? {};
    set((state) => ({
      globalSequence: nextSeq,
      fieldSequences: {
        ...state.fieldSequences,
        [deviceId]: {
          ...currentDeviceSeqs,
          [field]: nextSeq,
        },
      },
    }));
    return nextSeq;
  },

  markField: (deviceId, field, sequence) => {
    const currentDeviceSeqs = get().fieldSequences[deviceId] ?? {};
    set((state) => ({
      fieldSequences: {
        ...state.fieldSequences,
        [deviceId]: {
          ...currentDeviceSeqs,
          [field]: sequence,
        },
      },
    }));
  },

  canRollback: (deviceId, field, sequence) => {
    if (!sequence || sequence <= 0) return false;
    const currentSeq = get().fieldSequences[deviceId]?.[field];
    // If the field sequence equals the command sequence, no newer command has updated this field
    return currentSeq === sequence;
  },
});
