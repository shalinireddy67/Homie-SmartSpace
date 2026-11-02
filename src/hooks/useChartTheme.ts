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
      text: isDark ? '#F0F3F1' : '#202522',
      textMuted: isDark ? '#A2A9A4' : '#686F6A',
      border: isDark ? '#353C37' : '#E4E7E4',
      accent: isDark ? '#52B788' : '#2D6A4F',
      accentSubtle: isDark ? 'rgba(82, 183, 136, 0.2)' : 'rgba(45, 106, 79, 0.15)',
      success: isDark ? '#34D399' : '#167949',
      warning: isDark ? '#FBBF24' : '#B45309',
      danger: isDark ? '#F87171' : '#DC2626',
      surface: isDark ? '#222623' : '#FFFFFF',
      surfaceCard: isDark ? '#222623' : '#FFFFFF',
      tooltipBg: isDark ? '#222623' : '#FFFFFF',
      tooltipBorder: isDark ? '#353C37' : '#E4E7E4',
      gridColor: isDark ? '#2B312D' : '#ECEFEC',
    };
  }, [isDark]);
}
