import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
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
      'process.env.EXPO_OS': JSON.stringify('web'),
      'process.env.GOOGLE_MAPS_WEB_API_KEY': JSON.stringify(env.GOOGLE_MAPS_WEB_API_KEY || 'AIzaSyDrZWSM9FJ7pURqvnd2lNqK5y0I084kupE'),
      'process.env.VITE_GOOGLE_MAPS_WEB_API_KEY': JSON.stringify(env.GOOGLE_MAPS_WEB_API_KEY || 'AIzaSyDrZWSM9FJ7pURqvnd2lNqK5y0I084kupE'),
      'process.env': JSON.stringify({
        NODE_ENV: mode === 'production' ? 'production' : 'development',
        VOLCRE_API_BASE_URL: env.VOLCRE_API_BASE_URL || '',
        VOLCRE_WEB_API_BASE_URL: env.VOLCRE_WEB_API_BASE_URL || '',
        GOOGLE_MAPS_WEB_API_KEY: env.GOOGLE_MAPS_WEB_API_KEY || 'AIzaSyDrZWSM9FJ7pURqvnd2lNqK5y0I084kupE',
        VITE_GOOGLE_MAPS_WEB_API_KEY: env.GOOGLE_MAPS_WEB_API_KEY || 'AIzaSyDrZWSM9FJ7pURqvnd2lNqK5y0I084kupE',
        EXPO_OS: 'web',
      }),
    },
    server: {
      host: '0.0.0.0',
      port: 8081,
      allowedHosts: true,
      proxy: {
        '/auth': 'http://127.0.0.1:8000',
        '/users': 'http://127.0.0.1:8000',
        '/volunteers': 'http://127.0.0.1:8000',
        '/partners': 'http://127.0.0.1:8000',
        '/projects': 'http://127.0.0.1:8000',
        '/events': 'http://127.0.0.1:8000',
        '/messages': 'http://127.0.0.1:8000',
        '/notifications': 'http://127.0.0.1:8000',
        '/reports': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
        '/db-health': 'http://127.0.0.1:8000',
        '/validation': 'http://127.0.0.1:8000',
        '/ws': {
          target: 'ws://127.0.0.1:8000',
          ws: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 8081,
      allowedHosts: true,
      proxy: {
        '/auth': 'http://127.0.0.1:8000',
        '/users': 'http://127.0.0.1:8000',
        '/volunteers': 'http://127.0.0.1:8000',
        '/partners': 'http://127.0.0.1:8000',
        '/projects': 'http://127.0.0.1:8000',
        '/events': 'http://127.0.0.1:8000',
        '/messages': 'http://127.0.0.1:8000',
        '/notifications': 'http://127.0.0.1:8000',
        '/reports': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
        '/db-health': 'http://127.0.0.1:8000',
        '/validation': 'http://127.0.0.1:8000',
        '/ws': {
          target: 'ws://127.0.0.1:8000',
          ws: true,
        },
      },
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
