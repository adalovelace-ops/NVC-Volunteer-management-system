import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getApiBaseUrl } from "../models/storage";
import { getFirebaseApp } from "../lib/firebase";
import { SafePlatform } from "./safePlatform";

// Initialize Firebase messaging only on web or if needed
let app;
let firebaseMessaging: any;

if (SafePlatform.OS === 'web') {
  try {
    app = getFirebaseApp();
    firebaseMessaging = getMessaging(app);
  } catch (e) {
    console.warn("Firebase messaging not initialized or not supported on this platform.", e);
  }
}

const saveTokenToBackend = async (userId: string, token: string) => {
  try {
    await fetch(`${getApiBaseUrl()}/auth/fcm-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        fcm_token: token
      })
    });
  } catch (error) {
    console.error("Failed to save token to backend:", error);
  }
};

export const requestNotificationPermissionAndGetToken = async (userId: string) => {
  if (SafePlatform.OS !== 'web') {
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === 1 || // AUTHORIZED
        authStatus === 2;   // PROVISIONAL
      
      if (enabled) {
        const currentToken = await messaging().getToken();
        if (currentToken) {
          await saveTokenToBackend(userId, currentToken);
          return currentToken;
        }
      }
    } catch (error) {
      console.error("Native FCM permission/token error:", error);
    }
    return null;
  }

  // Web implementation
  if (!firebaseMessaging || typeof window === 'undefined' || !('Notification' in window)) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(firebaseMessaging, { vapidKey: 'YOUR_VAPID_KEY' });
      
      if (currentToken) {
        await saveTokenToBackend(userId, currentToken);
        return currentToken;
      }
    }
  } catch (error) {
    console.error("An error occurred while retrieving web token: ", error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (SafePlatform.OS !== 'web') {
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
          resolve(remoteMessage);
          unsubscribe();
        });
      } catch (e) {
        console.warn("Native FCM onMessageListener failed:", e);
      }
    } else {
      if (firebaseMessaging) {
        const unsubscribe = onMessage(firebaseMessaging, (payload) => {
          resolve(payload);
          unsubscribe();
        });
      }
    }
  });

export const setupNotificationListeners = (onMessageReceived: (payload: any) => void) => {
  if (SafePlatform.OS !== 'web') {
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      
      // Foreground message listener
      const unsubscribeForeground = messaging().onMessage(async (remoteMessage: any) => {
        onMessageReceived(remoteMessage);
      });
      
      // Background message listener / interaction
      const unsubscribeNotificationOpen = messaging().onNotificationOpenedApp((remoteMessage: any) => {
        console.log('Notification caused app to open from background state:', remoteMessage.notification);
      });

      messaging()
        .getInitialNotification()
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage.notification);
          }
        });

      return () => {
        unsubscribeForeground();
        unsubscribeNotificationOpen();
      };
    } catch (e) {
      console.warn("FCM native listeners failed to initialize:", e);
    }
  } else {
    if (firebaseMessaging) {
      const unsubscribe = onMessage(firebaseMessaging, (payload: any) => {
        onMessageReceived(payload);
      });
      return unsubscribe;
    }
  }
  return () => {};
};
