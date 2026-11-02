import { StateCreator } from 'zustand';

export interface UISlice {
  theme: 'light' | 'dark' | 'system';
  activeModal: string | null;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setActiveModal: (modal: string | null) => void;
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  theme: 'light',
  activeModal: null,

  setTheme: (theme) => set({ theme }),
  setActiveModal: (activeModal) => set({ activeModal }),
});

