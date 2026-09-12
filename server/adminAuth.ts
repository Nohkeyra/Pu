import type express from "express";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, hasAdminCredentials } from "./firebaseAdmin.js";
import { createDistributedRateLimiter } from "./distributedRateLimit.js";

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
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing session token" });
  }

  try {
    if (!hasAdminCredentials()) {
        throw new Error("Admin credentials not configured");
    }
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
    next();
  } catch (err) {
    console.error(`[Admin Auth] verifyAdminToken rejected token on ${req.method} ${req.originalUrl}:`, err);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token" });
  }
}
