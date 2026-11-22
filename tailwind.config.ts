import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        outerCanvas: 'rgb(var(--color-outer-canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          subtle: 'rgb(var(--color-surface-subtle) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          subtle: 'rgb(var(--color-accent-subtle) / <alpha-value>)',
        },
        arc: {
          fill: 'rgb(var(--color-arc-fill) / <alpha-value>)',
          track: 'rgb(var(--color-arc-track) / <alpha-value>)',
        },
        pastel: {
          blue: {
            bg: 'rgb(var(--color-pastel-blue-bg) / <alpha-value>)',
            text: 'rgb(var(--color-pastel-blue-text) / <alpha-value>)',
          },
          yellow: {
            bg: 'rgb(var(--color-pastel-yellow-bg) / <alpha-value>)',
            text: 'rgb(var(--color-pastel-yellow-text) / <alpha-value>)',
          },
          green: {
            bg: 'rgb(var(--color-pastel-green-bg) / <alpha-value>)',
            text: 'rgb(var(--color-pastel-green-text) / <alpha-value>)',
          },
          peach: {
            bg: 'rgb(var(--color-pastel-peach-bg) / <alpha-value>)',
            text: 'rgb(var(--color-pastel-peach-text) / <alpha-value>)',
          },
          lavender: {
            bg: 'rgb(var(--color-pastel-lavender-bg) / <alpha-value>)',
            text: 'rgb(var(--color-pastel-lavender-text) / <alpha-value>)',
          },
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          subtle: 'rgb(var(--color-success-subtle) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          subtle: 'rgb(var(--color-warning-subtle) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          subtle: 'rgb(var(--color-danger-subtle) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: '0.375rem', // 6px
        md: '0.5rem',   // 8px (controls, buttons, inputs)
        lg: '0.75rem',  // 12px (cards, components)
        xl: '0.75rem',  // 12px
        '2xl': '1rem',  // 16px (panels, modals, hero containers)
        '3xl': '1.25rem', // 20px (dashboard shell)
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        soft: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
