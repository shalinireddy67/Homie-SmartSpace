import { useMemo } from 'react';
import { useTheme } from './useTheme';

export interface ChartThemeColors {
  isDark: boolean;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSubtle: string;
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
  const isDark = theme === 'dark';

  return useMemo(() => {
    return {
      isDark,
      text: isDark ? '#f8fafc' : '#0f172a',
      textMuted: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#334155' : '#e2e8f0',
      accent: isDark ? '#6366f1' : '#4f46e5',
      accentSubtle: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.12)',
      success: isDark ? '#34d399' : '#10b981',
      warning: isDark ? '#fbbf24' : '#d97706',
      danger: isDark ? '#fb7185' : '#e11d48',
      surface: isDark ? '#0f172a' : '#ffffff',
      surfaceCard: isDark ? '#1e293b' : '#ffffff',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipBorder: isDark ? '#334155' : '#cbd5e1',
      gridColor: isDark ? '#1e293b' : '#f1f5f9',
    };
  }, [isDark]);
}

