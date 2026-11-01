import { StateCreator } from 'zustand';
import type { LogEvent, EventFilter } from '@/types';

/**
 * Maximum in-memory event buffer.
 * Holds all 10,000 seeded events plus up to 5,000 runtime events before rolling.
 */
export const MAX_EVENT_BUFFER = 15000;

export interface EventSlice {
  events: LogEvent[];
  filter: EventFilter;
  selectedEventId: string | null;

  setEvents: (events: LogEvent[]) => void;
  addEvent: (event: LogEvent) => void;
  setFilter: (filter: Partial<EventFilter>) => void;
  resetFilter: () => void;
  selectEvent: (id: string | null) => void;
}

const defaultFilter: EventFilter = {
  searchQuery: '',
  sortOrder: 'desc',
};

export const createEventSlice: StateCreator<
  EventSlice,
  [],
  [],
  EventSlice
> = (set) => ({
  events: [],
  filter: defaultFilter,
  selectedEventId: null,

  setEvents: (events) =>
    set({
      events: events.slice(0, MAX_EVENT_BUFFER),
    }),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_EVENT_BUFFER),
    })),

  setFilter: (filterUpdates) =>
    set((state) => ({
      filter: { ...state.filter, ...filterUpdates },
    })),

  resetFilter: () => set({ filter: defaultFilter }),

  selectEvent: (selectedEventId) => set({ selectedEventId }),
});
