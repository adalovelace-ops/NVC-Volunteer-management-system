import { StyleSheet, Platform } from 'react-native';
import { GLOBAL_FONT_FAMILY, FONT_WEIGHTS } from './fonts';

/**
 * Global stylesheet with Nunito font applied by default
 * Use these base styles as a foundation for component styles
 */
export const globalStyles = StyleSheet.create({
  // Text styles with Nunito font
  textBase: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Regular',
    }),
  },

  textLight: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Light',
    }),
    ...(Platform.OS === 'web' && { fontWeight: '300' }),
  },

  textRegular: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Regular',
    }),
    ...(Platform.OS === 'web' && { fontWeight: '400' }),
  },

  textSemibold: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-SemiBold',
    }),
    ...(Platform.OS === 'web' && { fontWeight: '600' }),
  },

  textBold: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Bold',
    }),
    ...(Platform.OS === 'web' && { fontWeight: '700' }),
  },

  textExtraBold: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-ExtraBold',
    }),
    ...(Platform.OS === 'web' && { fontWeight: '800' }),
  },

  // Common text sizes with Nunito
  h1: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-ExtraBold',
    }),
    fontSize: 32,
    fontWeight: Platform.select({ web: '800', default: undefined }),
  },

  h2: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Bold',
    }),
    fontSize: 28,
    fontWeight: Platform.select({ web: '700', default: undefined }),
  },

  h3: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Bold',
    }),
    fontSize: 24,
    fontWeight: Platform.select({ web: '700', default: undefined }),
  },

  body: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Regular',
    }),
    fontSize: 16,
    lineHeight: 24,
  },

  bodySmall: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Regular',
    }),
    fontSize: 14,
    lineHeight: 20,
  },

  caption: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-Light',
    }),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Platform.select({ web: '300', default: undefined }),
  },

  label: {
    fontFamily: Platform.select({
      web: GLOBAL_FONT_FAMILY,
      default: 'Nunito-SemiBold',
    }),
    fontSize: 14,
    fontWeight: Platform.select({ web: '600', default: undefined }),
  },
});

/**
 * Apply global Nunito font to a style object
 * @param style - The style object to enhance
 * @returns The enhanced style with Nunito font applied
 */
export function withNunitoFont(style: any = {}): any {
  return {
    ...globalStyles.textBase,
    ...style,
  };
}

export default globalStyles;
