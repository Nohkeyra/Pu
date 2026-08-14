import type express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { getFirestore } from "./firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

// F-XX (audit 2026-08-02): express-rate-limit was already declared in
// package.json but never actually wired to any route — the admin login
// endpoint accepted unlimited password guesses from any IP. This limiter
// is in-memory only (no Redis), which is appropriate for the current
// single-instance Render deployment. If the deployment ever moves to
// multiple instances, this must be swapped for a shared store (e.g.
// Redis-backed) or each instance will track attempts independently.
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please try again later." },
  // Only count failed attempts against the limit; a successful login
  // shouldn't consume the same budget as a string of bad guesses.
  skipSuccessfulRequests: true,
});

// F-SEC (audit 2026-08-14): previously, a missing ADMIN_JWT_SECRET silently
// fell back to a random in-process secret (console.warn only, server kept
// running). Combined with the ADMIN_PASSWORD fallback in authRoutes.ts, a
// misconfigured deploy (env var missing on Render) could leave the app
// serving admin traffic on a weak/implicit trust boundary with no hard
// failure signal. In production this must fail closed: refuse to boot
// rather than run with a secret nobody chose. Local/dev workflows (Termux,
// no .env yet) are intentionally exempted via NODE_ENV so `npm run dev`
// still works without ceremony — Render sets NODE_ENV=production by
// default, so the real deployment target is covered.
let ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET || ADMIN_JWT_SECRET.trim() === "") {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Admin Auth] ADMIN_JWT_SECRET is not set. Refusing to start in production — " +
      "set ADMIN_JWT_SECRET on Render before deploying."
    );
  }
  console.warn(
    "[Admin Auth] ADMIN_JWT_SECRET is not set. Generating a temporary random secret for this dev/local session only. " +
    "This will NOT work in production (NODE_ENV=production) — the server will refuse to start instead."
  );
  ADMIN_JWT_SECRET = crypto.randomBytes(32).toString("hex");
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
    if (adminPayload.role !== "admin" && adminPayload.admin !== true) {
      return res.status(401).json({ error: "Unauthorized: Token is not an admin token" });
    }
    (req as express.Request & { adminPayload?: typeof adminPayload }).adminPayload = adminPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token" });
  }
}
