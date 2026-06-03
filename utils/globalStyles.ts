import { StyleSheet, Platform } from 'react-native';
import { GLOBAL_FONT_FAMILY, FONT_WEIGHTS } from './fonts';

/**
 * Global text styles using Nunito font family
 * Use these throughout your app for consistent typography
 */
export const globalTextStyles = StyleSheet.create({
  // Base text styles
  text: {
    fontFamily: GLOBAL_FONT_FAMILY,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
  },
  textLight: {
    fontFamily: Platform.OS === 'web' ? GLOBAL_FONT_FAMILY : FONT_WEIGHTS.light as string,
    fontWeight: Platform.OS === 'web' ? '300' : undefined,
  },
  textRegular: {
    fontFamily: Platform.OS === 'web' ? GLOBAL_FONT_FAMILY : FONT_WEIGHTS.normal as string,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
  },
  textSemiBold: {
    fontFamily: Platform.OS === 'web' ? GLOBAL_FONT_FAMILY : FONT_WEIGHTS.semibold as string,
    fontWeight: Platform.OS === 'web' ? '600' : undefined,
  },
  textBold: {
    fontFamily: Platform.OS === 'web' ? GLOBAL_FONT_FAMILY : FONT_WEIGHTS.bold as string,
    fontWeight: Platform.OS === 'web' ? '700' : undefined,
  },
  textExtraBold: {
    fontFamily: Platform.OS === 'web' ? GLOBAL_FONT_FAMILY : FONT_WEIGHTS.extrabold as string,
    fontWeight: Platform.OS === 'web' ? '800' : undefined,
  },
});

/**
 * Helper to get font style based on weight
 */
export function getFontStyle(weight: 'light' | 'normal' | 'semibold' | 'bold' | 'extrabold' = 'normal') {
  return {
    fontFamily: Platform.OS === 'web' ? GLOBAL_FONT_FAMILY : FONT_WEIGHTS[weight] as string,
    fontWeight: Platform.OS === 'web' ? {
      light: '300',
      normal: '400',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    }[weight] : undefined,
  };
}

/**
 * Apply Nunito font to any text component
 * Example: <Text style={withNunito({ fontSize: 16, color: '#000' })}>Hello</Text>
 */
export function withNunito(styles?: any) {
  return {
    ...globalTextStyles.text,
    ...styles,
  };
}
