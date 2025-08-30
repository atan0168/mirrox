export const colors = {
  // Pure monochrome palette
  black: '#000000',
  white: '#FFFFFF',

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
