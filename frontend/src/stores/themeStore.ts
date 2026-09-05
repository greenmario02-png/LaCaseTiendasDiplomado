import { create } from 'zustand';

interface ThemeState {
  darkMode: boolean;
  toggle: () => void;
  setDarkMode: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  darkMode: localStorage.getItem('darkMode') === 'true',

  toggle: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem('darkMode', String(next));
      return { darkMode: next };
    }),

  setDarkMode: (dark) => {
    localStorage.setItem('darkMode', String(dark));
    set({ darkMode: dark });
  },
}));
