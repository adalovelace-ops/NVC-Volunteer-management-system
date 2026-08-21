import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// ──────────────────────────────────────────────────────────────────────────────
// SETUP — follow these steps before using the app:
//
// 1.  Go to https://console.firebase.google.com/  →  Add project  (any name)
// 2.  Project Settings (gear icon) → General → "Your apps" → Add app → Web (</> icon)
//     Register with any nickname (e.g. "volcre-web").  You'll get a firebaseConfig object.
// 3.  Paste your config values into the placeholder object below.
// 4.  In the Firebase console → Build → Firestore Database → Create database
//     → Start in **test mode** (allows all reads/writes) → pick a region close to you.
// 5.  That's it.  The app will work immediately in dev.
//
// For production, update firestore.rules (see firestore.rules in the project root).
// ──────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            'AIzaSyA7vmNQtknNutlm7WqhTRCuQczGA-sjnGM',
  authDomain:        'nvc-chat-c44dc.firebaseapp.com',
  projectId:         'nvc-chat-c44dc',
  storageBucket:     'nvc-chat-c44dc.firebasestorage.app',
  messagingSenderId: '80950080445',
  appId:             '1:80950080445:web:3233c79830c2adc75518d4',
};

let app: FirebaseApp;
let firestore: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}
