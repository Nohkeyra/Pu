import { Router } from 'express';
import semver from 'semver';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { secureCompare } from './authRoutes.js';

const router = Router();

// The live-update channel tells every installed app where to download the new APK, so the
// URL must be an asset of THIS repository's GitHub releases (what build-apk.yml publishes).
// Android also refuses an update signed with a different key, but an allowlist stops the
// download prompt from ever pointing somewhere else.
const ALLOWED_APK_PATH_PREFIX = '/Nohkeyra/Pu/releases/download/';

export function isAllowedApkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.port === '' &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(ALLOWED_APK_PATH_PREFIX) &&
      url.pathname.endsWith('.apk')
    );
  } catch {
    return false;
  }
}

const INVALID_APK_URL_MESSAGE = 'apkUrl must be an .apk asset from this repository\'s GitHub releases.';

const DEFAULT_VERSION_CONFIG = {
  latestVersion: '1.3.208',
  minVersion: '1.2.0',
  buildNumber: 340,
  apkUrl: 'https://github.com/Nohkeyra/Pu/releases/download/v1.3.208/app-release-signed.apk',
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
    const docRef = db.collection('app_config').doc('version');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      const remoteVer = String(data.latestVersion || '0.0.0');
      const cleanRemote = semver.clean(remoteVer) || semver.coerce(remoteVer)?.version || '0.0.0';
      if (semver.valid(cleanRemote) && semver.lt(cleanRemote, DEFAULT_VERSION_CONFIG.latestVersion)) {
        const merged = { ...data, ...DEFAULT_VERSION_CONFIG };
        return res.json({ success: true, ...merged });
      }
      return res.json({ success: true, ...DEFAULT_VERSION_CONFIG, ...data });
    }
    return res.json({ success: true, ...DEFAULT_VERSION_CONFIG });
  } catch {
    return res.json({ success: true, ...DEFAULT_VERSION_CONFIG });
  }
});

router.post('/app-version/github-sync', async (req, res) => {
  try {
    const secret = process.env.RELEASE_SYNC_SECRET;
    if (!secret || secret.trim() === '') {
      return res.status(503).json({ error: 'Release sync is not configured on this server.' });
    }

    const headerVal = req.headers['x-github-token'];
    const incomingToken = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    if (!incomingToken || typeof incomingToken !== 'string' || !secureCompare(incomingToken.trim(), secret.trim())) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing sync token' });
    }

    const { version, buildNumber, apkUrl, releaseNotes } = req.body;
    if (!version) {
      return res.status(400).json({ error: 'version is required' });
    }

    const payload = {
      latestVersion: String(version).trim(),
      minVersion: '1.2.0',
      buildNumber: Number(buildNumber || DEFAULT_VERSION_CONFIG.buildNumber),
      apkUrl: String(apkUrl || `https://github.com/Nohkeyra/Pu/releases/download/v${version}/app-release-signed.apk`).trim(),
      bundleUrl: '',
      releaseNotes: Array.isArray(releaseNotes) 
        ? releaseNotes 
        : [releaseNotes ? String(releaseNotes) : 'Kemaskini automatik dari pelepasan GitHub.'],
      forceUpdate: false,
      updatedAt: new Date().toISOString(),
      publishedBy: 'GitHub Actions Auto-Sync'
    };

    if (!isAllowedApkUrl(payload.apkUrl)) {
      return res.status(400).json({ error: INVALID_APK_URL_MESSAGE });
    }

    const db = getFirestore();
    await db.collection('app_config').doc('version').set(payload, { merge: true });

    return res.json({ success: true, message: 'App live version updated automatically via GitHub Release!', config: payload });
  } catch (err) {
    console.error('[UpdateRoutes] GitHub release sync failed:', err);
    return res.status(500).json({ error: 'Unable to update app version configuration.' });
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
      buildNumber: Number(buildNumber || DEFAULT_VERSION_CONFIG.buildNumber),
      apkUrl: String(apkUrl || DEFAULT_VERSION_CONFIG.apkUrl).trim(),
      bundleUrl: String(bundleUrl || '').trim(),
      releaseNotes: Array.isArray(releaseNotes) ? releaseNotes : [String(releaseNotes)],
      forceUpdate: Boolean(forceUpdate),
      updatedAt: new Date().toISOString(),
      publishedBy: adminReq.adminPayload?.sub || adminReq.adminPayload?.jti || 'System Admin'
    };

    if (!isAllowedApkUrl(payload.apkUrl)) {
      return res.status(400).json({ error: INVALID_APK_URL_MESSAGE });
    }

    const db = getFirestore();
    await db.collection('app_config').doc('version').set(payload, { merge: true });

    return res.json({ success: true, message: 'App live version updated successfully', config: payload });
  } catch (err) {
    console.error('[UpdateRoutes] Admin app-version update failed:', err);
    return res.status(500).json({ error: 'Unable to update app version configuration.' });
  }
});

export default router;
