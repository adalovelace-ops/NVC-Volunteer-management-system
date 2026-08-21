import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getApiBaseUrl } from "../models/storage";

import { getFirebaseApp } from "../lib/firebase";

// Initialize Firebase messaging only on web or if needed
let app;
let firebaseMessaging: any;

try {
  app = getFirebaseApp();
  firebaseMessaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase messaging not initialized or not supported on this platform.", e);
}

export const requestNotificationPermissionAndGetToken = async (userId: string) => {
  if (!firebaseMessaging || typeof window === 'undefined' || !('Notification' in window)) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(firebaseMessaging, { vapidKey: 'YOUR_VAPID_KEY' });
      
      if (currentToken) {
        // Send token to backend
        await fetch(`${getApiBaseUrl()}/auth/fcm-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            fcm_token: currentToken
          })
        });
        return currentToken;
      }
    }
  } catch (error) {
    console.error("An error occurred while retrieving token: ", error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (firebaseMessaging) {
      onMessage(firebaseMessaging, (payload) => {
        resolve(payload);
      });
    }
  });
