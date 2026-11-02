import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'nestora_theme';

function getSystemPreference(): Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as ThemeMode;
    }
    return 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemPreference);

  // Resolved active theme ('light' or 'dark') applied to DOM
  const resolvedTheme: Theme = themeMode === 'system' ? systemTheme : themeMode;

  const applyToDOM = useCallback((activeTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (activeTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback(
    (newMode: ThemeMode) => {
      setThemeModeState(newMode);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newMode);
      } catch {
        // LocalStorage might be disabled
      }
      const active = newMode === 'system' ? getSystemPreference() : newMode;
      applyToDOM(active);
    },
    [applyToDOM]
  );

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // Synchronize DOM whenever resolved theme changes
  useEffect(() => {
    applyToDOM(resolvedTheme);
  }, [applyToDOM, resolvedTheme]);

  // Listen to OS system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const updatedSys = e.matches ? 'dark' : 'light';
      setSystemTheme(updatedSys);
      const stored = getStoredThemeMode();
      if (stored === 'system') {
        applyToDOM(updatedSys);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyToDOM]);

  return {
    theme: resolvedTheme,
    themeMode,
    toggleTheme,
    setTheme,
  };
}

