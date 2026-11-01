import { StateCreator } from 'zustand';
import type { SimulationSpeed, SimulationState } from '@/types';

export interface SimulationSlice extends SimulationState {
  setRunning: (running: boolean) => void;
  setSpeed: (speed: SimulationSpeed) => void;
  setSeed: (seed: number) => void;
  setVirtualTime: (virtualTime: number) => void;
  advanceVirtualTime: (deltaMs: number) => void;
  setFailNextCommand: (failNextCommand: boolean) => void;
  setFailureProbability: (failureProbability: number) => void;
}

export const createSimulationSlice: StateCreator<
  SimulationSlice,
  [],
  [],
  SimulationSlice
> = (set) => ({
  running: false,
  speed: 1,
  seed: 4242,
  virtualTime: 1730476800000, // Fixed baseline virtual time
  failNextCommand: false,
  failureProbability: 0.05,

  setRunning: (running) => set({ running }),
  setSpeed: (speed) => set({ speed }),
  setSeed: (seed) => set({ seed }),
  setVirtualTime: (virtualTime) => set({ virtualTime }),
  advanceVirtualTime: (deltaMs) =>
    set((state) => ({ virtualTime: state.virtualTime + deltaMs })),
  setFailNextCommand: (failNextCommand) => set({ failNextCommand }),
  setFailureProbability: (failureProbability) => set({ failureProbability }),
});
