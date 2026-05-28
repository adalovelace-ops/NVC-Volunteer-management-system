// Initialize Platform module before any other imports can use it
// This ensures Platform is available on web even though it's not fully implemented

let PlatformModule: any;

try {
  PlatformModule = require('react-native').Platform;
} catch (e) {
  // On web, react-native.Platform may not be fully initialized yet
  // Create a minimal polyfill
  PlatformModule = {
    OS: 'web',
    select: function(obj: any) {
      const os = this.OS;
      if (os === 'web' && obj.web !== undefined) return obj.web;
      if (os === 'ios' && obj.ios !== undefined) return obj.ios;
      if (os === 'android' && obj.android !== undefined) return obj.android;
      return obj.default !== undefined ? obj.default : obj.web;
    }
  };
}

// Make Platform globally available  
(globalThis as any).Platform = PlatformModule;

// Detect ?mode=mobile on web at the very start of the bundle lifecycle.
const isMobileModeOnWeb = (() => {
  if (PlatformModule.OS !== 'web') return false;
  try {
    if (typeof window !== 'undefined' && window?.location?.search) {
      return new URLSearchParams(window.location.search).get('mode') === 'mobile';
    }
  } catch {}
  return false;
})();

if (isMobileModeOnWeb) {
  try {
    const RN = require('react-native');

    // Patch Dimensions.get so any manual Dimensions.get('window') calls
    // report the locked phone dimensions.
    if (RN.Dimensions) {
      const originalGet = RN.Dimensions.get;
      RN.Dimensions.get = function(dimension: any) {
        if (dimension === 'window' || dimension === 'screen') {
          return {
            width: 430,
            height: 932,
            scale: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
            fontScale: 1,
          };
        }
        return originalGet.apply(this, arguments);
      };
    }

    // Patch the useWindowDimensions hook to report locked phone dimensions
    // to all reactive screens and components.
    try {
      Object.defineProperty(RN, 'useWindowDimensions', {
        get: () => () => ({
          width: 430,
          height: 932,
          scale: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
          fontScale: 1,
        }),
        configurable: true,
      });
    } catch (e) {
      try {
        RN.useWindowDimensions = () => ({
          width: 430,
          height: 932,
          scale: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
          fontScale: 1,
        });
      } catch (err) {}
    }
  } catch (e) {
    console.warn('Failed to patch Dimensions/Platform for mobile mode:', e);
  }
}

// Capture this JS runtime's boot timestamp for startup performance logs.
(globalThis as any).__NVC_APP_BOOT_TS__ = Date.now();

export {};
