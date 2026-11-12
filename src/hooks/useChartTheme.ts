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
      text: isDark ? '#EDF3F3' : '#111618',
      textMuted: isDark ? '#96A6AA' : '#526066',
      border: isDark ? '#586B70' : '#7E9397',
      accent: isDark ? '#5EC2AC' : '#1F6F60',
      accentSubtle: isDark ? 'rgba(94, 194, 172, 0.2)' : 'rgba(60, 141, 123, 0.18)',
      arcFill: isDark ? '#5EC2AC' : '#3C8D7B',
      arcTrack: isDark ? '#263235' : '#DEEDEA',
      success: isDark ? '#4ADE80' : '#116B41',
      warning: isDark ? '#FBBF24' : '#995306',
      danger: isDark ? '#F87171' : '#B91C1C',
      surface: isDark ? '#161C1E' : '#FFFFFF',
      surfaceCard: isDark ? '#192023' : '#F5F9FA',
      tooltipBg: isDark ? '#1D2528' : '#FFFFFF',
      tooltipBorder: isDark ? '#586B70' : '#7E9397',
      gridColor: isDark ? '#283437' : '#DCE8EA',
    };
  }, [isDark]);
}
