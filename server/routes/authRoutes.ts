import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken, effectiveJwtSecret, adminLoginLimiter, revokeJti } from '../adminAuth.js';

const router = Router();

// Admin Login Endpoint
router.post('/login', adminLoginLimiter, async (req, res) => {
  const { password } = req.body;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  const rawAdminPass = process.env.ADMIN_PASSWORD || 'wawasan123';

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
      const auth = getAuth();
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
router.get('/verify', verifyAdminToken, (_req, res) => {
  return res.json({ success: true, verified: true });
});

// Admin Logout Endpoint
router.post('/logout', verifyAdminToken, async (req, res) => {
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
router.post('/branding', verifyAdminToken, async (req, res) => {
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
router.get('/next-invoice-number', async (_req, res) => {
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
