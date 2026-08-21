import { Platform } from 'react-native';

/**
 * Hook to manage DM Sans font family across the app
 * In bare React Native, fonts are linked at the native level (Xcode/Android)
 * This hook simply returns true since fonts are pre-loaded
 */
export function useDMSansFont() {
  // Fonts are linked at native level, so they're always available
  return true;
}

/**
 * Global default font family to use throughout the app
 */
export const GLOBAL_FONT_FAMILY = Platform.select({
  web: "'Nunito', sans-serif",
  default: 'Nunito',
});

/**
 * Font weight mappings for Nunito font
 */
export const FONT_WEIGHTS = {
  light: Platform.select({ web: '300', default: '300' }),
  normal: Platform.select({ web: '400', default: '400' }),
  semibold: Platform.select({ web: '600', default: '600' }),
  bold: Platform.select({ web: '700', default: '700' }),
  extrabold: Platform.select({ web: '800', default: '800' }),
} as const;
