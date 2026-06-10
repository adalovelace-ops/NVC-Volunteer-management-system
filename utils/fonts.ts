import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while fonts are loading
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Hook to load and manage Nunito font family across the app
 * Handles both mobile (via expo-font) and web (via Google Fonts)
 */
export function useNunitoFont() {
  // On web, fonts are already injected via Google Fonts in App.tsx
  // Skip the font loading hook to prevent blocking the UI
  if (Platform.OS === 'web') {
    return true;
  }

  const [fontsLoaded] = useFonts({
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'Nunito-SemiBold': require('../assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Light': require('../assets/fonts/Nunito-Light.ttf'),
    'Nunito-ExtraBold': require('../assets/fonts/Nunito-ExtraBold.ttf'),
  });

  return fontsLoaded;
}

/**
 * Global default font family to use throughout the app
 */
export const GLOBAL_FONT_FAMILY = Platform.select({
  web: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: 'Nunito-Regular',
});

/**
 * Font weight mappings for Nunito font
 */
export const FONT_WEIGHTS = {
  light: Platform.select({ web: '300', default: 'Nunito-Light' }),
  normal: Platform.select({ web: '400', default: 'Nunito-Regular' }),
  semibold: Platform.select({ web: '600', default: 'Nunito-SemiBold' }),
  bold: Platform.select({ web: '700', default: 'Nunito-Bold' }),
  extrabold: Platform.select({ web: '800', default: 'Nunito-ExtraBold' }),
} as const;
