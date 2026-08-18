import { getFirestore, runWithRetry } from "./firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

export interface LogAuditOptions {
  action: string;
  performedBy: string;
  performedByName?: string;
  targetType: "order" | "invoice" | "preset" | "export";
  targetId?: string;
  details?: string;
}

export async function logAuditEvent(options: LogAuditOptions): Promise<void> {
  const timestamp = new Date().toISOString();
  try {
    const db = getFirestore();
    const ref = db.collection("audit_logs").doc();
    const logDoc = {
      id: ref.id,
      action: options.action,
      performedBy: options.performedBy || "system",
      performedByName: options.performedByName || options.performedBy || "System User",
      targetType: options.targetType,
      targetId: options.targetId || "",
      details: options.details || "",
      timestamp,
      createdAt: FieldValue.serverTimestamp(),
    };
    await runWithRetry(() => ref.set(logDoc));

    if (process.env.NODE_ENV === "production") {
      console.log(
        JSON.stringify({
          severity: "INFO",
          component: "AuditLog",
          action: options.action,
          targetType: options.targetType,
          targetId: options.targetId || null,
          performedBy: options.performedBy,
          timestamp,
        })
      );
    } else {
      console.log(`[AuditLog] ${options.action} logged for ${options.targetType} (${options.targetId || 'N/A'})`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "production") {
      console.error(
        JSON.stringify({
          severity: "WARNING",
          component: "AuditLog",
          action: options.action,
          targetType: options.targetType,
          error: errorMsg,
          timestamp,
        })
      );
    } else {
      console.warn("[AuditLog] Failed to record audit log:", err);
    }
  }
}
