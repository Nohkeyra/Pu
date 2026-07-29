import type express from "express";
import jwt from "jsonwebtoken";
import { getFirestore } from "./firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET || ADMIN_JWT_SECRET.trim() === "") {
  // Fail closed instead of falling back to a hardcoded, publicly-known secret.
  // A predictable fallback secret would let anyone who knows the string forge
  // valid admin tokens whenever the env var is accidentally omitted.
  throw new Error(
    "[Admin Auth] ADMIN_JWT_SECRET is not set. Refusing to start with an " +
    "insecure fallback secret. Set ADMIN_JWT_SECRET in the environment " +
    "(Render) to a 64+ byte random value."
  );
}
export const effectiveJwtSecret: string = ADMIN_JWT_SECRET;

export async function revokeJti(jti: string | undefined, exp?: number): Promise<void> {
  if (typeof jti === "string") {
    try {
      const adminDb = getFirestore();
      await adminDb.collection("revokedTokens").doc(jti).set({
        revokedAt: Timestamp.now(),
        exp: exp || null,
      });
    } catch (error) {
      console.error("Error revoking JTI in Firestore:", error);
      throw error;
    }
  }
}

export async function isJtiRevoked(jti: string | undefined): Promise<boolean> {
  if (typeof jti !== "string") return false;
  try {
    const adminDb = getFirestore();
    const doc = await adminDb.collection("revokedTokens").doc(jti).get();
    return doc.exists;
  } catch (error) {
    console.error("Error checking token revocation in Firestore:", error);
    return false;
  }
}

export async function verifyAdminToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing admin session token" });
  }
  try {
    const payload = jwt.verify(token, effectiveJwtSecret) as jwt.JwtPayload;
    if (payload.jti && await isJtiRevoked(payload.jti)) {
      return res.status(401).json({ error: "Unauthorized: Token has been revoked" });
    }
    const adminPayload = payload as jwt.JwtPayload & { role?: string; admin?: boolean };
    if (adminPayload.role !== "admin" || adminPayload.admin !== true) {
      return res.status(401).json({ error: "Unauthorized: Token is not an admin token" });
    }
    (req as express.Request & { adminPayload?: typeof adminPayload }).adminPayload = adminPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token" });
  }
}
