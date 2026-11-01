import { StateCreator } from 'zustand';
import type { Room } from '@/types';

export interface RoomSlice {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
}

export const createRoomSlice: StateCreator<RoomSlice, [], [], RoomSlice> = (set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  updateRoom: (roomId, updates) => {
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
    }));
  },
});
