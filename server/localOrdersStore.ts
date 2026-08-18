import fs from "fs";
import path from "path";
import type { OrderData } from "./firebaseAdmin.js";

type LocalOrder = Partial<OrderData> & { id: string; [key: string]: unknown };

const ENABLE_LOCAL_FALLBACK = (process.env.ENABLE_LOCAL_FALLBACK || "false").toLowerCase() === "true";
const LOCAL_ORDERS_FILE = path.join(process.cwd(), "orders.local.json");

let memoryCache: LocalOrder[] | null = null;
let writeChain: Promise<void> = Promise.resolve();

export function getLocalOrders(): LocalOrder[] {
  if (!ENABLE_LOCAL_FALLBACK) {
    return [];
  }
  if (memoryCache !== null) {
    return memoryCache;
  }
  try {
    if (!fs.existsSync(LOCAL_ORDERS_FILE)) {
      memoryCache = [];
      return memoryCache;
    }
    const raw = fs.readFileSync(LOCAL_ORDERS_FILE, "utf-8");
    if (!raw.trim()) {
      memoryCache = [];
      return memoryCache;
    }
    const parsed = JSON.parse(raw);
    memoryCache = Array.isArray(parsed) ? parsed : [];
    return memoryCache;
  } catch (err) {
    console.error("[localOrdersStore] Failed to read local orders backup:", err);
    memoryCache = [];
    return memoryCache;
  }
}

export function saveLocalOrders(orders: LocalOrder[]): void {
  if (!ENABLE_LOCAL_FALLBACK) {
    return;
  }
  memoryCache = orders;

  // Non-blocking serialized writes to prevent concurrent file corruption (race conditions)
  writeChain = writeChain.then(async () => {
    try {
      await fs.promises.writeFile(LOCAL_ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
    } catch (err) {
      console.error("[localOrdersStore] Failed to write local orders backup:", err);
    }
  });
}
