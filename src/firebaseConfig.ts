import { initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  type Auth,
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { Capacitor } from '@capacitor/core';
import firebaseAppletConfig from "../firebase-applet-config.json";

// Production configuration for the live database used in compiling the app for the APK
const prodConfig = {
  apiKey: "AIzaSyCaCFMk6K8go9Wgt-jdNd6QTvD8JbsTkY4",
  authDomain: "restoran-wawasan.firebaseapp.com",
  projectId: "restoran-wawasan",
  storageBucket: "restoran-wawasan.firebasestorage.app",
  messagingSenderId: "1019707766959",
  appId: "1:1019707766959:web:78644cddb16b67a69ffc5a",
  measurementId: "G-ZWC8H62RZN",
  firestoreDatabaseId: undefined
};

// Sandbox configuration for the Google AI Studio workspace environment
const sandboxConfig = {
  apiKey: firebaseAppletConfig.apiKey || prodConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain || prodConfig.authDomain,
  projectId: firebaseAppletConfig.projectId || prodConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket || prodConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || prodConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId || prodConfig.appId,
  firestoreDatabaseId: (firebaseAppletConfig as Record<string, string | undefined>).firestoreDatabaseId
};

// Determine if we are running inside the Google AI Studio workspace preview or on a native mobile device.
// When compiled for the APK, we check both hostname and Capacitor state.
export const isNative = Capacitor.isNativePlatform();
const isWorkspace = typeof window !== "undefined" && (
  window.location.hostname.endsWith(".run.app") ||
  window.location.hostname.includes("aistudio") ||
  (window.location.hostname === "localhost" && window.location.port === "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port === "3000")
);

// We use sandboxConfig for the workspace preview, but native (APK) and other environments
// should always connect directly to the production project (restoran-wawasan).
const firebaseConfig = (isWorkspace && !isNative) ? sandboxConfig : prodConfig;

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore DB
const dbId = firebaseConfig.firestoreDatabaseId;
let dbInstance: Firestore;
if (dbId && dbId !== "(default)") {
  try {
    dbInstance = getFirestore(app, dbId);
  } catch {
    dbInstance = getFirestore(app);
  }
} else {
  dbInstance = getFirestore(app);
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

// Initialize Analytics (Browser only)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  try {
    analyticsInstance = getAnalytics(app);
  } catch {
    // Ignore analytics failures
  }
}
export const analytics = analyticsInstance;

export default function getApp() {
  return app;
}
