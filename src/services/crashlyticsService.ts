import { FirebaseCrashlytics } from "@capacitor-firebase/crashlytics";
import { isNative } from "../firebaseConfig";
import { logEvent } from "./analyticsService";

let isInitialized = false;

/**
 * Initialize Crashlytics for Native and Web
 */
export async function initCrashlytics(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    if (isNative) {
      await FirebaseCrashlytics.setEnabled({ enabled: true }).catch(() => {});
      console.log("[Crashlytics] Native Firebase Crashlytics initialized");
    } else {
      console.log("[Crashlytics] Web Crashlytics monitoring initialized");
    }
  } catch (err) {
    console.warn("[Crashlytics] Initialization notice:", err);
  }

  // Register global window error and unhandled rejection hooks
  if (typeof window !== "undefined") {
    const isBenignNoise = (msg: string): boolean => {
      const lower = msg.toLowerCase();
      return (
        lower.includes("websocket") ||
        lower.includes("failed to fetch") ||
        lower.includes("networkerror") ||
        lower.includes("network error") ||
        lower.includes("load failed") ||
        lower.includes("aborterror") ||
        lower.includes("aborted") ||
        lower.includes("resizeobserver loop") ||
        lower.includes("non-error promise rejection") ||
        lower === "undefined" ||
        lower === "null" ||
        lower === ""
      );
    };

    window.addEventListener("error", (event) => {
      const msg = event.message || event.error?.message || "";
      if (isBenignNoise(msg)) {
        return;
      }
      recordException(event.error || new Error(event.message || "Unknown window error"), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: "uncaught_window_error",
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      if (!reason) {
        return;
      }
      const message = reason?.message || String(reason);
      if (reason?.name === "AbortError" || isBenignNoise(message)) {
        return;
      }
      const error = reason instanceof Error ? reason : new Error(String(reason));
      recordException(error, {
        type: "unhandled_promise_rejection",
      });
    });
  }
}

// Auto-initialize Crashlytics
initCrashlytics();

/**
 * Record an exception/error to Crashlytics and Analytics
 */
export async function recordException(
  error: Error | string,
  context: Record<string, any> = {}
): Promise<void> {
  const errObj = typeof error === "string" ? new Error(error) : error;
  const message = errObj.message || "Unknown Application Exception";
  
  if (
    errObj.name === "AbortError" ||
    message.includes("aborted") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Load failed") ||
    String(error).includes("AbortError") ||
    String(error).includes("Failed to fetch")
  ) {
    return;
  }
  const stack = errObj.stack || "No stack trace available";

  console.error("[Crashlytics Exception Captured]:", message, context, errObj);

  try {
    if (isNative) {
      // Record exception to Firebase Crashlytics native SDK
      await FirebaseCrashlytics.recordException({
        message,
        stacktrace: parseStackTrace(stack),
      }).catch(() => {});
    }

    // Also log error event to Analytics for queryable web & mobile dashboards
    logEvent("app_exception", {
      error_message: message.substring(0, 100),
      error_name: errObj.name || "Error",
      context_type: context.type || "runtime_exception",
      ...context,
    });
  } catch {
    // Fail-safe
  }
}

/**
 * Add a custom breadcrumb log message in Crashlytics
 */
export async function logCrashMessage(message: string): Promise<void> {
  try {
    if (isNative) {
      await FirebaseCrashlytics.log({ message }).catch(() => {});
    }
    console.log(`[Crashlytics Breadcrumb]: ${message}`);
  } catch {
    // Fail-safe
  }
}

/**
 * Set User ID for Crashlytics sessions
 */
export async function setCrashlyticsUserId(userId: string): Promise<void> {
  try {
    if (isNative) {
      await FirebaseCrashlytics.setUserId({ userId }).catch(() => {});
    }
  } catch {
    // Fail-safe
  }
}

/**
 * Set custom key/value metadata for Crashlytics reports
 */
export async function setCrashlyticsCustomKey(key: string, value: string | number | boolean): Promise<void> {
  try {
    if (isNative) {
      await FirebaseCrashlytics.setCustomKey({
        key,
        value: String(value),
        type: "string",
      }).catch(() => {});
    }
  } catch {
    // Fail-safe
  }
}

/**
 * Helper to structure stack trace for Crashlytics
 */
function parseStackTrace(stackString: string) {
  const lines = stackString.split("\n");
  return lines.map((line) => {
    const trimmed = line.trim();
    return {
      file: trimmed,
      lineNumber: 1,
      methodName: trimmed,
    };
  });
}
