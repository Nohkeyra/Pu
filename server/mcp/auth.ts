import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function mcpBearerAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.MCP_ACCESS_TOKEN?.trim();
  if (!expected) return next();
  const match = /^Bearer\s+(.+)$/i.exec(req.header('authorization') || '');
  const supplied = match?.[1]?.trim() || '';
  if (!supplied || !safeEqual(supplied, expected)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
