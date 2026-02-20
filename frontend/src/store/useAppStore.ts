import { create } from 'zustand';

interface AppState {
  message: string;
  setMessage: (message: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  message: '',
  setMessage: (message) => set({ message }),
}));
