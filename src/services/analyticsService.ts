import { getAnalytics, isSupported, logEvent as logWebEvent, setUserId as setWebUserId, setUserProperties as setWebUserProperties, Analytics } from "firebase/analytics";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";
import { app, isNative } from "../firebaseConfig";

let webAnalyticsInstance: Analytics | null = null;
let isInitialized = false;

/**
 * Initialize Analytics for Web & Native platforms
 */
export async function initAnalytics(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    if (isNative) {
      // Enable Capacitor native Firebase Analytics
      await FirebaseAnalytics.setEnabled({ enabled: true }).catch(() => {});
      console.log("[Analytics] Native Firebase Analytics initialized");
    } else {
      // Initialize Web Firebase Analytics if supported
      const supported = await isSupported().catch(() => false);
      if (supported) {
        webAnalyticsInstance = getAnalytics(app);
        console.log("[Analytics] Web Firebase Analytics initialized");
      } else {
        console.log("[Analytics] Web Analytics not supported in this environment");
      }
    }
  } catch (err) {
    console.warn("[Analytics] Initialization notice:", err);
  }
}

// Auto-initialize asynchronously
initAnalytics();

/**
 * Log a custom analytics event across Web and Native platforms
 */
export async function logEvent(eventName: string, params: Record<string, any> = {}): Promise<void> {
  const sanitizedParams = {
    ...params,
    timestamp: new Date().toISOString(),
    platform: isNative ? "android_native" : "web",
  };

  try {
    if (isNative) {
      await FirebaseAnalytics.logEvent({
        name: eventName,
        params: sanitizedParams,
      }).catch(() => {});
    } else if (webAnalyticsInstance) {
      logWebEvent(webAnalyticsInstance, eventName, sanitizedParams);
    }
  } catch {
    // Fail silently in development/sandbox environments
    console.debug(`[Analytics Event] ${eventName}:`, sanitizedParams);
  }
}

/**
 * Log a screen/page view
 */
export async function logScreenView(screenName: string, screenClass: string = "AppPage"): Promise<void> {
  try {
    if (isNative) {
      await FirebaseAnalytics.setCurrentScreen({
        screenName,
        screenClassOverride: screenClass,
      }).catch(() => {});
    } else if (webAnalyticsInstance) {
      logWebEvent(webAnalyticsInstance, "screen_view", {
        firebase_screen: screenName,
        firebase_screen_class: screenClass,
      });
    }
  } catch {
    console.debug(`[Analytics ScreenView] ${screenName}`);
  }
}

/**
 * Set current user ID for event attribution
 */
export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  try {
    if (isNative) {
      await FirebaseAnalytics.setUserId({ userId }).catch(() => {});
    } else if (webAnalyticsInstance && userId) {
      setWebUserId(webAnalyticsInstance, userId);
    }
  } catch (err) {
    console.debug("[Analytics] Set user ID notice:", err);
  }
}

/**
 * Set user property (e.g. role, language preference)
 */
export async function setAnalyticsUserProperty(key: string, value: string): Promise<void> {
  try {
    if (isNative) {
      await FirebaseAnalytics.setUserProperty({ key, value }).catch(() => {});
    } else if (webAnalyticsInstance) {
      setWebUserProperties(webAnalyticsInstance, { [key]: value });
    }
  } catch (err) {
    console.debug(`[Analytics] Set user property notice (${key}=${value}):`, err);
  }
}

/**
 * Helper: Track Order Flow Steps
 */
export function logOrderStep(step: number, stepName: string, extra: Record<string, any> = {}) {
  logEvent("order_checkout_step", {
    step_number: step,
    step_name: stepName,
    ...extra,
  });
}

/**
 * Helper: Track Completed Orders
 */
export function logOrderSubmitted(orderId: string, amount: number, itemCount: number, eventType: string) {
  logEvent("purchase", {
    transaction_id: orderId,
    value: amount,
    currency: "MYR",
    items_count: itemCount,
    event_type: eventType,
  });
}

/**
 * Helper: Track Menu Selection
 */
export function logDishSelected(dishId: string, dishName: string, category: string, price: number) {
  logEvent("select_item", {
    item_id: dishId,
    item_name: dishName,
    item_category: category,
    price: price,
    currency: "MYR",
  });
}
