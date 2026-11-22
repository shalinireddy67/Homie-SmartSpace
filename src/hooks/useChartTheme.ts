import { useEffect, useMemo, useState } from 'react';
import { useTheme } from './useTheme';

export interface ChartThemeColors {
  isDark: boolean;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSubtle: string;
  arcFill: string;
  arcTrack: string;
  success: string;
  warning: string;
  danger: string;
  surface: string;
  surfaceCard: string;
  tooltipBg: string;
  tooltipBorder: string;
  gridColor: string;
}

export function useChartTheme(): ChartThemeColors {
  const { theme } = useTheme();
  const [domIsDark, setDomIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return theme === 'dark';
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      setDomIsDark(theme === 'dark');
      return;
    }

    const root = document.documentElement;
    const sync = () => {
      setDomIsDark(root.classList.contains('dark'));
    };
    sync();

    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  const isDark = typeof document !== 'undefined' ? domIsDark : theme === 'dark';

  return useMemo(() => {
    return {
      isDark,
      text: isDark ? '#E8E6E1' : '#1F1E1B',
      textMuted: isDark ? '#9E9C94' : '#545049',
      border: isDark ? '#6E6D66' : '#8C867B',
      accent: isDark ? '#7BAFA3' : '#2E534C',
      accentSubtle: isDark ? 'rgba(123, 175, 163, 0.2)' : 'rgba(46, 83, 76, 0.15)',
      arcFill: isDark ? '#7BAFA3' : '#2E534C',
      arcTrack: isDark ? '#32322E' : '#DFDCD5',
      success: isDark ? '#68BA88' : '#2A6846',
      warning: isDark ? '#DDA15E' : '#8A5314',
      danger: isDark ? '#E06D6D' : '#9E2A2B',
      surface: isDark ? '#212120' : '#F7F6F2',
      surfaceCard: isDark ? '#262624' : '#F7F6F2',
      tooltipBg: isDark ? '#2B2B28' : '#F7F6F2',
      tooltipBorder: isDark ? '#6E6D66' : '#8C867B',
      gridColor: isDark ? '#34332F' : '#D9D6CE',
    };
  }, [isDark]);
}
