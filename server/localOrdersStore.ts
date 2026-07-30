import fs from "fs";
import path from "path";
import type { OrderData } from "./firebaseAdmin.js";

/**
 * Local JSON-file fallback store for orders.
 *
 * Root cause note: `getLocalOrders`/`saveLocalOrders` were called from
 * server.ts and server/calendarService.ts (~15 call sites) but were never
 * defined anywhere in the codebase. This module implements them.
 *
 * This is only meant to be used when ENABLE_LOCAL_FALLBACK=true, as a
 * last-resort backup when Firestore is unreachable. Per .env.example, this
 * is NOT recommended on Render because its disk is ephemeral (wiped on
 * every deploy/restart) -- it is a stop-gap, not durable storage.
 */

type LocalOrder = Partial<OrderData> & { id: string; [key: string]: unknown };

const ENABLE_LOCAL_FALLBACK =
  (process.env.ENABLE_LOCAL_FALLBACK || "false").toLowerCase() === "true";

const LOCAL_ORDERS_FILE = path.join(process.cwd(), "orders.local.json");

/**
 * Reads the local orders backup file.
 * Returns an empty array if the feature is disabled, the file doesn't
 * exist yet, or the file is unreadable/corrupt -- callers should treat
 * this as "no local backup available" rather than throwing.
 */
export function getLocalOrders(): LocalOrder[] {
  if (!ENABLE_LOCAL_FALLBACK) {
    return [];
  }

  try {
    if (!fs.existsSync(LOCAL_ORDERS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_ORDERS_FILE, "utf-8");
    if (!raw.trim()) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[localOrdersStore] Failed to read local orders backup:", err);
    return [];
  }
}

/**
 * Persists the full array of local orders to disk.
 * No-op if the feature is disabled. Errors are logged, not thrown, so a
 * failed local write never breaks the caller's primary (Firestore) flow.
 */
export function saveLocalOrders(orders: LocalOrder[]): void {
  if (!ENABLE_LOCAL_FALLBACK) {
    return;
  }

  try {
    fs.writeFileSync(LOCAL_ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("[localOrdersStore] Failed to write local orders backup:", err);
  }
}
