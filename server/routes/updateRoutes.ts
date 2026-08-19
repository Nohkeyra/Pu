import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';

const router = Router();

const DEFAULT_VERSION_CONFIG = {
  latestVersion: '1.3.8',
  minVersion: '1.2.0',
  buildNumber: 139,
  apkUrl: 'https://github.com/Nohkeyra/Pu/releases/download/v7.0/Wawasan.Hub.apk',
  bundleUrl: '',
  releaseNotes: [
    'Prestasi aplikasi & kestabilan haptik dipertingkatkan.',
    'Penyelarasan pesanan automatik & keselamatan Firebase diperkemas.',
    'Sokongan muat turun APK langsung dan Capgo OTA Live Updates.'
  ],
  forceUpdate: false,
  updatedAt: new Date().toISOString(),
  publishedBy: 'System Admin'
};

router.get('/app-version', async (_req, res) => {
  try {
    const db = getFirestore();
    const docSnap = await db.collection('app_config').doc('version').get();
    if (docSnap.exists) {
      return res.json({ success: true, ...DEFAULT_VERSION_CONFIG, ...docSnap.data() });
    }
    return res.json({ success: true, ...DEFAULT_VERSION_CONFIG });
  } catch {
    return res.json({ success: true, ...DEFAULT_VERSION_CONFIG });
  }
});

router.post('/app-version', verifyAdminToken, async (req, res) => {
  try {
    const adminReq = req as typeof req & {
      adminPayload?: {
        jti?: string;
        sub?: string;
        role?: string;
      };
    };

    const { latestVersion, minVersion, buildNumber, apkUrl, bundleUrl, releaseNotes, forceUpdate } = req.body;
    if (!latestVersion) {
      return res.status(400).json({ error: 'latestVersion is required' });
    }

    const payload = {
      latestVersion: String(latestVersion).trim(),
      minVersion: String(minVersion || '1.2.0').trim(),
      buildNumber: Number(buildNumber || 125),
      apkUrl: String(apkUrl || DEFAULT_VERSION_CONFIG.apkUrl).trim(),
      bundleUrl: String(bundleUrl || '').trim(),
      releaseNotes: Array.isArray(releaseNotes) ? releaseNotes : [String(releaseNotes)],
      forceUpdate: Boolean(forceUpdate),
      updatedAt: new Date().toISOString(),
      publishedBy: adminReq.adminPayload?.sub || adminReq.adminPayload?.jti || 'System Admin'
    };

    const db = getFirestore();
    await db.collection('app_config').doc('version').set(payload, { merge: true });

    return res.json({ success: true, message: 'App live version updated successfully', config: payload });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
