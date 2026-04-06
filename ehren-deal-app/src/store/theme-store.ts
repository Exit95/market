import { create } from 'zustand';
import { Appearance } from 'react-native';
import storage from '@/lib/storage';

type ColorScheme = 'light' | 'dark' | 'system';

interface ThemeState {
  colorScheme: ColorScheme;
  isDark: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  loadSavedTheme: () => Promise<void>;
}

function resolveIsDark(scheme: ColorScheme): boolean {
  if (scheme === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return scheme === 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  colorScheme: 'system',
  isDark: resolveIsDark('system'),

  setColorScheme: async (scheme) => {
    set({ colorScheme: scheme, isDark: resolveIsDark(scheme) });
    await storage.setItem('theme', scheme);
  },

  loadSavedTheme: async () => {
    const saved = await storage.getItem('theme');
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      set({
        colorScheme: saved as ColorScheme,
        isDark: resolveIsDark(saved as ColorScheme),
      });
    }
  },
}));
