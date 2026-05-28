# Nunito Font Setup Guide

This document explains how to set up Nunito font files for the application.

## What's Configured

- **App-wide Nunito Font**: The entire app now uses Nunito font
- **Web Support**: Google Fonts integration for web platform
- **Mobile Support**: Font files loaded via expo-font
- **Custom Text Component**: Use `components/Text.tsx` for consistent Nunito styling
- **Global Styles**: `utils/globalStyles.ts` provides pre-made typography styles

## Font Files Required

To complete the setup, download the following Nunito font files and place them in `assets/fonts/`:

- `Nunito-Light.ttf` (weight: 300)
- `Nunito-Regular.ttf` (weight: 400)
- `Nunito-SemiBold.ttf` (weight: 600)
- `Nunito-Bold.ttf` (weight: 700)
- `Nunito-ExtraBold.ttf` (weight: 800)

### Download Options

1. **Google Fonts**: https://fonts.google.com/specimen/Nunito
   - Download the full font family
   - Extract TTF files to `assets/fonts/`

2. **FontSquirrel**: https://www.fontsquirrel.com/fonts/nunito
   - Download @font-face kit
   - Extract TTF files to `assets/fonts/`

## Usage in Components

### Method 1: Use Custom Text Component (Recommended)

```typescript
import { Text } from '../components/Text';

<Text weight="bold">Bold Text</Text>
<Text weight="semibold" style={{ fontSize: 16 }}>Semi-bold Text</Text>
```

### Method 2: Use Global Styles

```typescript
import { globalStyles } from '../utils/globalStyles';
import { Text } from 'react-native';

<Text style={globalStyles.h1}>Heading 1</Text>
<Text style={globalStyles.body}>Body Text</Text>
<Text style={globalStyles.caption}>Caption</Text>
```

### Method 3: Manual Style Application

```typescript
import { GLOBAL_FONT_FAMILY } from '../utils/fonts';

<Text style={{ fontFamily: GLOBAL_FONT_FAMILY }}>Text</Text>
```

## Migration Path

If you have existing Text components, you can progressively migrate them:

1. **Immediate**: Web will automatically use Google Fonts Nunito
2. **High Priority**: Replace `Text` imports in high-traffic screens with custom `Text` component
3. **Progressive**: Update remaining components over time

## Font Weights

The following weights are available:

- `light` (300)
- `normal` / `regular` (400)
- `semibold` (600)
- `bold` (700)
- `extrabold` (800)

## Platform-Specific Notes

### Web
- Fonts load from Google Fonts (no local files needed)
- Applied globally to `document.body`
- CSS fontWeight property used for weight variations

### Mobile (iOS/Android)
- Font files loaded from `assets/fonts/`
- Font names referenced via family name (e.g., 'Nunito-Bold')
- Requires font files to be present in assets

## Troubleshooting

If fonts don't load:

1. **Mobile**: Ensure TTF files are in `assets/fonts/` directory
2. **Web**: Check browser DevTools Network tab for Google Fonts request
3. **Clear Cache**: Run `expo prebuild --clean` and rebuild
4. **Verify app.json**: Ensure `expo-font` is in plugins list

## Next Steps

1. Create `assets/fonts/` directory
2. Download Nunito font files from Google Fonts or FontSquirrel
3. Place TTF files in the directory
4. Test the app with `expo start`
