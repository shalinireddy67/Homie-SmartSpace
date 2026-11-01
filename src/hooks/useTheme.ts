import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'nestora_theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // LocalStorage might be disabled or unavailable
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  useEffect(() => {
    // Initial sync
    applyTheme(theme);

    // Listen to OS theme changes if user hasn't explicitly set one and matchMedia is available
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (!stored) {
          const sysTheme: Theme = e.matches ? 'dark' : 'light';
          setThemeState(sysTheme);
          applyTheme(sysTheme);
        }
      } catch {
        // Ignored
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme, theme]);

  return { theme, toggleTheme, setTheme };
}
