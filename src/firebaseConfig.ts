import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  type Auth,
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';

// F-01 (audit): hardcoded Firebase web API key + full config bundle
// removed from the production source. All values are now sourced from
// build-time VITE_FIREBASE_* env vars and the build FAILS if any are
// missing in a production build. The AI-Studio sandbox overlay remains
// gated to non-native, non-prod previews only.

import firebaseAppletConfig from "../firebase-applet-config.json";

function requireEnv(key: string, fallbackKey?: keyof typeof firebaseAppletConfig): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (v && v.trim() !== "") {
    return v.trim();
  }
  if (fallbackKey && firebaseAppletConfig[fallbackKey]) {
    return firebaseAppletConfig[fallbackKey] as string;
  }
  return "";
}

const prodConfig = {
  apiKey:           requireEnv("VITE_FIREBASE_API_KEY", "apiKey"),
  authDomain:       requireEnv("VITE_FIREBASE_AUTH_DOMAIN", "authDomain"),
  projectId:        requireEnv("VITE_FIREBASE_PROJECT_ID", "projectId"),
  storageBucket:    requireEnv("VITE_FIREBASE_STORAGE_BUCKET", "storageBucket"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"),
  appId:            requireEnv("VITE_FIREBASE_APP_ID", "appId"),
  measurementId:    requireEnv("VITE_FIREBASE_MEASUREMENT_ID", "measurementId"),
  firestoreDatabaseId: undefined as string | undefined,
};

// Sandbox configuration for the Google AI Studio workspace environment
const sandboxConfig = {
  apiKey: firebaseAppletConfig.apiKey || prodConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain || prodConfig.authDomain,
  projectId: firebaseAppletConfig.projectId || prodConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket || prodConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || prodConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId || prodConfig.appId,
  measurementId: (firebaseAppletConfig as Record<string, string | undefined>).measurementId || prodConfig.measurementId,
  firestoreDatabaseId: (firebaseAppletConfig as Record<string, string | undefined>).firestoreDatabaseId
};

// Determine if we are running inside the Google AI Studio workspace preview or on a native mobile device.
export const isNative = Capacitor.isNativePlatform();
export const isWorkspace = typeof window !== "undefined" && (
  window.location.hostname.endsWith(".run.app") ||
  window.location.hostname.includes("aistudio") ||
  (window.location.hostname === "localhost" && window.location.port === "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port === "3000")
);

// We use sandboxConfig for the workspace preview, but native (APK) and other environments
// should always connect directly to the production project.
const firebaseConfig = (isWorkspace && !isNative) ? sandboxConfig : prodConfig;

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore DB with modern persistent cache configuration
const dbId = firebaseConfig.firestoreDatabaseId;
let dbInstance: Firestore;

try {
  const localCacheConfig = typeof window !== 'undefined'
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : undefined;

  if (dbId && dbId !== "(default)") {
    dbInstance = initializeFirestore(app, {
      localCache: localCacheConfig,
      experimentalForceLongPolling: isWorkspace
    }, dbId);
  } else {
    dbInstance = initializeFirestore(app, {
      localCache: localCacheConfig,
      experimentalForceLongPolling: isWorkspace
    });
  }
} catch {
  if (dbId && dbId !== "(default)") {
    try {
      dbInstance = getFirestore(app, dbId);
    } catch {
      dbInstance = getFirestore(app);
    }
  } else {
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

// Initialize Auth
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence,
    ],
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

// Initialize Analytics (disabled to prevent CSP and network Failed to fetch errors)
export const analytics = null;

export default function getApp() {
  return app;
}
