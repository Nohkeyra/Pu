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
      timestamp: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await runWithRetry(() => ref.set(logDoc));
    console.log(`[AuditLog] ${options.action} logged for ${options.targetType} (${options.targetId || 'N/A'})`);
  } catch (err) {
    console.warn("[AuditLog] Failed to record audit log:", err);
  }
}
