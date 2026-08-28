import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, getAdminApp } from '../firebaseAdmin.js';
import { verifyAdminToken, effectiveJwtSecret, adminLoginLimiter, revokeJti } from '../adminAuth.js';

const router = Router();

// F-SEC (audit 2026-08-14): this endpoint used to fall back to a hardcoded
// literal password ('wawasan123') whenever ADMIN_PASSWORD_HASH and
// ADMIN_PASSWORD were both unset — a value visible to anyone reading the
// public GitHub source. Combined with the previous ADMIN_JWT_SECRET
// auto-generate fallback, a Render deploy missing both env vars would let
// anyone log in as admin with a password known from the repo itself.
// Both production and dev now fail closed: no configured credential means
// no logins are accepted at all (503), rather than silently accepting a
// known password. This applies in dev too — on Termux, set ADMIN_PASSWORD
// in your local .env before `npm run dev` if you need to log in as admin.
router.post('/admin/login', adminLoginLimiter, async (req, res) => {
  const { password } = req.body;
  let adminHash = process.env.ADMIN_PASSWORD_HASH;
  const rawAdminPass = process.env.ADMIN_PASSWORD;

  const db = getFirestore();

  // Auto-sync or load credentials via Firestore meta/admin_auth (Admin SDK only)
  if (adminHash || rawAdminPass) {
    try {
      const hashToSync = adminHash || await bcrypt.hash(rawAdminPass!, 10);
      await db.collection('meta').doc('admin_auth').set({
        hash: hashToSync,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (syncErr) {
      console.warn('[Admin Auth] Auto-sync to Firestore failed (non-fatal):', syncErr);
    }
  } else {
    try {
      const authDoc = await db.collection('meta').doc('admin_auth').get();
      if (authDoc.exists) {
        const data = authDoc.data();
        if (data && data.hash) {
          adminHash = data.hash;
        }
      }
    } catch (dbErr) {
      console.warn('[Admin Auth] Failed to fetch synced credential from Firestore:', dbErr);
    }
  }

  if (!adminHash && !rawAdminPass) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Admin Auth] Login rejected: neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set in production.'
      );
      return res.status(503).json({
        success: false,
        error: 'Admin login is not configured on this server.',
      });
    }
    console.warn(
      '[Admin Auth] Neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set. ' +
      'Dev/local admin login is disabled until one is configured — set ADMIN_PASSWORD in your local .env.'
    );
    return res.status(503).json({
      success: false,
      error: 'Admin login is not configured. Set ADMIN_PASSWORD in your local .env.',
    });
  }

  let isValid = false;
  if (adminHash) {
    isValid = await bcrypt.compare(password, adminHash);
  } else {
    isValid = (password === rawAdminPass);
  }

  if (isValid) {
    const token = jwt.sign(
      { role: 'admin', admin: true, timestamp: Date.now() },
      effectiveJwtSecret,
      { expiresIn: '12h', jwtid: randomUUID() }
    );

    let firebaseCustomToken: string | null = null;
    try {
      const auth = getAuth(getAdminApp());
      firebaseCustomToken = await auth.createCustomToken('admin_hq_user', { admin: true });
    } catch (err) {
      console.warn('[Admin Auth] Firebase custom token creation failed:', err);
    }

    return res.json({ success: true, token, firebaseCustomToken });
  } else {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Admin Verify Token Endpoint
router.get('/admin/verify', verifyAdminToken, (_req, res) => {
  return res.json({ success: true, verified: true });
});

// Admin Logout Endpoint
router.post('/admin/logout', verifyAdminToken, async (req, res) => {
  try {
    const adminReq = req as any;
    if (adminReq.adminPayload && adminReq.adminPayload.jti) {
      await revokeJti(adminReq.adminPayload.jti, adminReq.adminPayload.exp);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin Auth] Logout error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Admin Branding Update Endpoint
router.post('/admin/branding', verifyAdminToken, async (req, res) => {
  try {
    const { accent } = req.body;
    const db = getFirestore();
    await db.collection('settings').doc('branding').set({ accent }, { merge: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Next Invoice Number Helper
router.get('/admin/next-invoice-number', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const counterSnap = await db.collection('meta').doc('invoiceCounter').get();
    let next = 1;
    if (counterSnap.exists) {
      const data = counterSnap.data();
      if (data && typeof data.count === 'number') {
        next = data.count + 1;
      }
    }
    const formatted = `RW-${String(next).padStart(4, '0')}`;
    return res.json({ nextInvoiceNo: formatted, next: formatted });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch counter' });
  }
});

export default router;
