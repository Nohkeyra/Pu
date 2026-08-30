import dotenv from "dotenv";

dotenv.config();

export interface FirebaseConfig {
  projectId: string;
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
  projectId: getFirebaseEnv("FIREBASE_PROJECT_ID", "restoran-wawasan"),
  firestoreDatabaseId: undefined,
};

export const STRICT_FIREBASE_ADMIN =
  (process.env.STRICT_FIREBASE_ADMIN || "false").toLowerCase() === "true";

export function clean(value?: string): string {
  return (value ?? "").trim();
}
