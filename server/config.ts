import dotenv from "dotenv";

dotenv.config();

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId?: string;
}

export function getFirebaseEnv(key: string, defaultValue: string): string {
  const v = process.env[key];
  if (!v || v.trim() === "") {
    return defaultValue;
  }
  return v.trim();
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: getFirebaseEnv("FIREBASE_API_KEY", "AIzaSyCaCFMk6K8go9Wgt-jdNd6QTvD8JbsTkY4"),
  authDomain: getFirebaseEnv("FIREBASE_AUTH_DOMAIN", "restoran-wawasan.firebaseapp.com"),
  projectId: getFirebaseEnv("FIREBASE_PROJECT_ID", "restoran-wawasan"),
  storageBucket: getFirebaseEnv("FIREBASE_STORAGE_BUCKET", "restoran-wawasan.firebasestorage.app"),
  messagingSenderId: getFirebaseEnv("FIREBASE_MESSAGING_SENDER_ID", "1019707766959"),
  appId: getFirebaseEnv("FIREBASE_APP_ID", "1:1019707766959:web:78644cddb16b67a69ffc5a"),
  measurementId: getFirebaseEnv("FIREBASE_MEASUREMENT_ID", "G-ZWC8H62RZN"),
  firestoreDatabaseId: undefined,
};

export const STRICT_FIREBASE_ADMIN =
  (process.env.STRICT_FIREBASE_ADMIN || "false").toLowerCase() === "true";

export const ENABLE_LOCAL_FALLBACK =
  (process.env.ENABLE_LOCAL_FALLBACK || "true").toLowerCase() === "true";

export const ENABLE_DEBUG_ENDPOINTS =
  (process.env.ENABLE_DEBUG_ENDPOINTS || "false").toLowerCase() === "true";

export const LOCAL_DB_PATH = "./orders.json";

export function clean(value?: string): string {
  return (value ?? "").trim();
}
