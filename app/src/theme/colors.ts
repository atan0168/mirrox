export const colors = {
  // Pure monochrome palette
  black: '#000000',
  white: '#FFFFFF',
  // App core brand / accent colors (added)
  primary: '#374151', // deep neutral used for primary UI elements

  // Common UI line / divider color (added)
  divider: '#E5E7EB',

  // Neutral grays
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  yellow: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  green: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },

  // Semantic colors
  secondary: '#F59E0B',
  success: '#10B981',
  warning: '#FBBF24',
  error: '#EF4444',

  // Opacity utilities for overlays
  overlay: {
    light: 'rgba(255, 255, 255, 0.2)',
    medium: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.05)',
    darker: 'rgba(0, 0, 0, 0.1)',
  },
} as const;

export type ColorKey = keyof typeof colors;
export type NeutralKey = keyof typeof colors.neutral;
export type OverlayKey = keyof typeof colors.overlay;
