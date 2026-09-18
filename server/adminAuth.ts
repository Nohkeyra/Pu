import type express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, hasAdminCredentials } from "./firebaseAdmin.js";
import { createDistributedRateLimiter } from "./distributedRateLimit.js";

export interface AdminJwtPayload {
  uid: string;
  email?: string;
  admin: boolean;
  role: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

export function getJwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "restoran-wawasan-admin-secret-key-2026";
}

export function signAdminJwt(payload: Partial<AdminJwtPayload>, expiresInSeconds = 24 * 60 * 60): string {
  const secret = getJwtSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AdminJwtPayload = {
    uid: payload.uid || "admin-root",
    email: payload.email || (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "madnor.noisy@gmail.com").split(",")[0].trim(),
    admin: true,
    role: "admin",
    iat: now,
    exp: now + expiresInSeconds,
    ...payload,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${b64Header}.${b64Payload}`)
    .digest("base64url");

  return `${b64Header}.${b64Payload}.${signature}`;
}

export function verifyAdminJwt(token: string): AdminJwtPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, signature] = parts;
    const secret = getJwtSecret();
    const expectedSig = createHmac("sha256", secret)
      .update(`${b64Header}.${b64Payload}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedSigBuf.length || !timingSafeEqual(sigBuf, expectedSigBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(b64Payload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as AdminJwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    if (payload.admin !== true) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Distributed rate limiter backed by Firestore with memory fallback across multiple instances
export const adminLoginLimiter = createDistributedRateLimiter({
  prefix: "admin_login",
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please try again later." },
  skipSuccessfulRequests: true,
});

export async function verifyAdminToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing session token" });
  }

  // 1. Verify via server-signed Admin JWT (with admin: true claim)
  const jwtPayload = verifyAdminJwt(token);
  if (jwtPayload && jwtPayload.admin === true) {
    (req as any).user = jwtPayload;
    (req as any).adminPayload = jwtPayload;
    return next();
  }

  // 2. Verify via Firebase ID token if Firebase Admin credentials are configured
  if (hasAdminCredentials()) {
    try {
      const decodedToken = await getAuth(getAdminApp()).verifyIdToken(token);
      
      const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      const userEmail = decodedToken.email?.toLowerCase();
      
      if (decodedToken.admin !== true) {
        if (userEmail && adminEmails.includes(userEmail)) {
          await getAuth(getAdminApp()).setCustomUserClaims(decodedToken.uid, { admin: true });
          // Let them through this time, their next token will have the claim natively.
        } else {
          return res.status(401).json({ error: "Unauthorized: Token is not an admin token" });
        }
      }

      (req as any).user = decodedToken;
      (req as any).adminPayload = decodedToken;
      return next();
    } catch (err) {
      console.warn(`[Admin Auth] Firebase verifyIdToken failed:`, err);
    }
  }

  return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token" });
}
