import type express from "express";
import jwt from "jsonwebtoken";
import { getFirestore } from "./firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";
import { createDistributedRateLimiter } from "./distributedRateLimit.js";

// Distributed rate limiter backed by Firestore with memory fallback across multiple instances
export const adminLoginLimiter = createDistributedRateLimiter({
  prefix: "admin_login",
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
    "[Admin Auth] ADMIN_JWT_SECRET is not set. Using a stable development secret for this dev/local session. " +
    "This prevents admin sessions from expiring on every local hot-reload/server restart. " +
    "This will NOT work in production (NODE_ENV=production) — the server will refuse to start instead."
  );
  ADMIN_JWT_SECRET = "wawasan_pak_usop_stable_development_jwt_secret_key_2026";
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
  } catch (err) {
    // F-AUTH-DIAG (audit 2026-09-02): this catch previously swallowed the
    // real reason jwt.verify() failed and returned only a generic message.
    // That made it impossible to tell, after the fact, whether a given 401
    // was a genuinely expired token, a secret/signature mismatch (e.g. the
    // token was signed by a different ADMIN_JWT_SECRET value than the one
    // currently loaded), a malformed/truncated token, or something else.
    // Logging the specific error here (server-side only, in Render logs)
    // lets that be checked directly instead of guessed at client-side.
    // Token itself is never logged in full — only a short, non-reusable
    // prefix, enough to correlate log lines without exposing a usable
    // credential in logs.
    const jwtErr = err as { name?: string; message?: string };
    console.error(
      `[Admin Auth] verifyAdminToken rejected token on ${req.method} ${req.originalUrl}: ` +
      `${jwtErr?.name || "UnknownError"} — ${jwtErr?.message || String(err)} ` +
      `(token prefix: ${token.slice(0, 12)}…, len ${token.length})`
    );
    return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token" });
  }
}
