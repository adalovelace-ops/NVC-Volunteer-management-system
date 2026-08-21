import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: [
        { find: 'react-native', replacement: path.resolve(__dirname, 'node_modules/react-native-web') },
        { find: 'react-native-vector-icons/MaterialIcons', replacement: path.resolve(__dirname, 'src/web-stubs/MaterialIcons.tsx') },
        { find: 'react-native-vector-icons/MaterialCommunityIcons', replacement: path.resolve(__dirname, 'src/web-stubs/MaterialCommunityIcons.tsx') },
        { find: 'react-native-vector-icons/Ionicons', replacement: path.resolve(__dirname, 'src/web-stubs/Ionicons.tsx') },
        { find: '@expo/vector-icons', replacement: path.resolve(__dirname, 'src/web-stubs/expoVectorIcons.tsx') },
        { find: 'react-native-fs', replacement: path.resolve(__dirname, 'src/web-stubs/reactNativeFs.ts') },
        { find: 'react-native-share', replacement: path.resolve(__dirname, 'src/web-stubs/reactNativeShare.ts') },
        { find: '@react-native-community/datetimepicker', replacement: path.resolve(__dirname, 'src/web-stubs/datetimePicker.tsx') },
        { find: 'react-native-image-picker', replacement: path.resolve(__dirname, 'src/web-stubs/imagePicker.ts') },
        { find: 'react-native-document-picker', replacement: path.resolve(__dirname, 'src/web-stubs/documentPicker.ts') },
        { find: 'expo-splash-screen', replacement: path.resolve(__dirname, 'src/web-stubs/expoSplashScreen.ts') },
      ],
      extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js', '.json'],
    },
    define: {
      __DEV__: JSON.stringify(mode !== 'production'),
      'global': 'globalThis',
      'process.env': JSON.stringify({
        NODE_ENV: mode === 'production' ? 'production' : 'development',
        VOLCRE_API_BASE_URL: env.VOLCRE_API_BASE_URL || '',
        VOLCRE_WEB_API_BASE_URL: env.VOLCRE_WEB_API_BASE_URL || '',        GOOGLE_MAPS_WEB_API_KEY: env.GOOGLE_MAPS_WEB_API_KEY || '',        VITE_GOOGLE_MAPS_WEB_API_KEY: env.VITE_GOOGLE_MAPS_WEB_API_KEY || '',
      }),
    },
    server: {
      host: '0.0.0.0',
      port: 8081,
    },
    preview: {
      host: '0.0.0.0',
      port: 8081,
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
        define: { global: 'globalThis' },
        resolveExtensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js', '.json'],
      },
    },
  };
});
