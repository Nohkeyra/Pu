import type express from "express";
import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  console.warn(
    "[Admin Auth] ADMIN_JWT_SECRET is not set in environment variables. " +
    "Falling back to a default secret. Set ADMIN_JWT_SECRET in Render's " +
    "environment to a 64+ byte random value."
  );
}
export const effectiveJwtSecret: string = ADMIN_JWT_SECRET || "wawasan-admin-jwt-secret-fallback-2026";

const revokedJtis: Set<string> = new Set();

export function revokeJti(jti: string | undefined): void {
  if (typeof jti === "string") revokedJtis.add(jti);
}

export function isJtiRevoked(jti: string | undefined): boolean {
  return typeof jti === "string" && revokedJtis.has(jti);
}

export function verifyAdminToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing admin session token" });
  }
  try {
    const payload = jwt.verify(token, effectiveJwtSecret) as jwt.JwtPayload;
    if (payload.jti && isJtiRevoked(payload.jti)) {
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
