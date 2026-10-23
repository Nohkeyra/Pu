import type express from "express";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, hasAdminCredentials, getFirestore } from "./firebaseAdmin.js";
import { createDistributedRateLimiter } from "./distributedRateLimit.js";

export interface AdminJwtPayload {
  uid: string;
  email?: string;
  admin: boolean;
  role: string;
  iat: number;
  exp: number;
  jti: string;
  [key: string]: any;
}

const EPHEMERAL_DEV_JWT_SECRET = randomBytes(32).toString("hex");
let warnedMissingSecretInProduction = false;

export function getJwtSecret(): string {
  const configured = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (configured && configured.trim()) {
    return configured.trim();
  }

  if (process.env.NODE_ENV === "production") {
    if (!warnedMissingSecretInProduction) {
      warnedMissingSecretInProduction = true;
      console.error(
        "[Admin Auth] FATAL: ADMIN_JWT_SECRET (or JWT_SECRET) is not set in production. " +
        "All admin authentication will fail until this is configured."
      );
    }
    throw new Error(
      "[Admin Auth] ADMIN_JWT_SECRET (or JWT_SECRET) must be set in production. " +
      "Refusing to sign or verify admin tokens with an unconfigured secret."
    );
  }

  return EPHEMERAL_DEV_JWT_SECRET;
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
    jti: randomBytes(16).toString("hex"),
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

    if (!payload.iat || !payload.jti) {
      // Reject legacy tokens missing required iat / jti claims
      return null;
    }

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

// Async JWT verification with Firestore revocation & blacklist check
export async function verifyAdminJwtWithRevocation(token: string): Promise<AdminJwtPayload | null> {
  const payload = verifyAdminJwt(token);
  if (!payload) return null;

  try {
    const db = getFirestore();
    // Check specific jti blacklist
    const jtiRef = db.collection('admin_revocations').doc(`jti_${payload.jti}`);
    const jtiSnap = await jtiRef.get();
    if (jtiSnap.exists) {
      return null;
    }

    // Check per-admin revocation timestamp (all tokens issued before revokedBefore are invalid)
    const adminRevokeRef = db.collection('admin_revocations').doc(`admin_${payload.uid}`);
    const adminRevokeSnap = await adminRevokeRef.get();
    if (adminRevokeSnap.exists) {
      const data = adminRevokeSnap.data();
      const revokedBefore = data?.revokedBefore?.toMillis ? data.revokedBefore.toMillis() : (data?.revokedBefore ? Number(data.revokedBefore) : 0);
      if (revokedBefore && payload.iat * 1000 < revokedBefore) {
        return null;
      }
    }
  } catch (err) {
    // Fail-closed behavior on revocation DB error in production / secure environments
    if (process.env.NODE_ENV === 'production' || process.env.STRICT_REVOCATION === 'true') {
      console.error('[Admin Auth] Revocation check failed securely (fail-closed):', err);
      return null;
    }
    console.warn('[Admin Auth] Revocation check warning (proceeding with caution in non-prod):', err);
  }

  return payload;
}

export const adminLoginLimiter = createDistributedRateLimiter({
  prefix: "admin_login",
  windowMs: 15 * 60 * 1000,
  limit: 10,
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

  // 1. Verify via server-signed Admin JWT with revocation & jti checks
  const jwtPayload = await verifyAdminJwtWithRevocation(token);
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
          // Safe custom claim update preserving existing claims and avoiding race conditions
          const userRecord = await getAuth(getAdminApp()).getUser(decodedToken.uid);
          const existingClaims = userRecord.customClaims || {};
          await getAuth(getAdminApp()).setCustomUserClaims(decodedToken.uid, { ...existingClaims, admin: true });
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

