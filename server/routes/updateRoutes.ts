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
      !url.password && !url.search && !url.hash &&
      url.pathname.startsWith(ALLOWED_APK_PATH_PREFIX) &&
      url.pathname.endsWith('.apk')
    );
  } catch {
    return false;
  }
}

const INVALID_APK_URL_MESSAGE = 'apkUrl must be an .apk asset from this repository\'s GitHub releases.';

const DEFAULT_VERSION_CONFIG = {
  latestVersion: '1.3.278',
  minVersion: '1.2.0',
  buildNumber: 410,
  apkUrl: 'https://github.com/Nohkeyra/Pu/releases/download/v1.3.278/app-release-signed.apk',
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

// Only publish an uploaded asset from the exact stable GitHub release.
export async function verifyPublishedRelease(version: string, apkUrl: string, bundleUrl = '', fetcher = fetch): Promise<'verified' | 'missing' | 'unavailable'> {
  if (!semver.valid(version) || !isAllowedApkUrl(apkUrl)
      || !apkUrl.startsWith(`https://github.com${ALLOWED_APK_PATH_PREFIX}v${version}/`)) return 'missing';
  if (bundleUrl) {
    try {
      const url = new URL(bundleUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password
          || url.search || url.hash || !url.pathname.startsWith(`${ALLOWED_APK_PATH_PREFIX}v${version}/`)
          || !url.pathname.endsWith('.zip')) return 'missing';
    } catch { return 'missing'; }
  }
  try {
    const response = await fetcher(`https://api.github.com/repos/Nohkeyra/Pu/releases/tags/v${encodeURIComponent(version)}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) return 'missing';
    if (!response.ok) return 'unavailable';
    const release = await response.json() as { tag_name?: string; draft?: boolean; prerelease?: boolean; assets?: { state?: string; browser_download_url?: string; size?: number }[] };
    if (release.tag_name !== `v${version}` || release.draft !== false || release.prerelease !== false || !Array.isArray(release.assets)) return 'missing';
    const hasAsset = (url: string) => release.assets?.some(asset => asset.state === 'uploaded' && typeof asset.size === 'number' && asset.size > 0 && asset.browser_download_url === url);
    return hasAsset(apkUrl) && (!bundleUrl || hasAsset(bundleUrl)) ? 'verified' : 'missing';
  } catch { return 'unavailable'; }
}

function validVersionMetadata(version: string, minVersion: string, buildNumber: number): boolean {
  return Boolean(semver.valid(version) && semver.valid(minVersion) && semver.lte(minVersion, version)
    && Number.isSafeInteger(buildNumber) && buildNumber > 0);
}

// Build-time constants identify source versions, not published releases.
const NO_PUBLISHED_RELEASE = {
  ...DEFAULT_VERSION_CONFIG,
  latestVersion: '0.0.0',
  minVersion: '0.0.0',
  buildNumber: 0,
  apkUrl: '',
  bundleUrl: '',
  releaseNotes: [],
  forceUpdate: false,
  publishedBy: 'Unavailable',
};

router.get('/app-version', async (_req, res) => {
  try {
    const db = getFirestore();
    const docRef = db.collection('app_config').doc('version');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      if (typeof data.latestVersion === 'string' && semver.valid(data.latestVersion)
        && typeof data.apkUrl === 'string' && isAllowedApkUrl(data.apkUrl)) {
        return res.json({ success: true, ...NO_PUBLISHED_RELEASE, ...data });
      }
    }
    return res.json({ success: true, ...NO_PUBLISHED_RELEASE });
  } catch {
    return res.json({ success: true, ...NO_PUBLISHED_RELEASE });
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
      buildNumber: Number(buildNumber),
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
    if (!validVersionMetadata(payload.latestVersion, payload.minVersion, payload.buildNumber)) {
      return res.status(400).json({ error: 'Invalid release version or build number.' });
    }
    const release = await verifyPublishedRelease(payload.latestVersion, payload.apkUrl, payload.bundleUrl);
    if (release !== 'verified') {
      return res.status(release === 'missing' ? 409 : 503).json({ error: release === 'missing' ? 'Release asset is not published.' : 'Could not verify GitHub release. Retry later.' });
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
      buildNumber: Number(buildNumber),
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
    if (!validVersionMetadata(payload.latestVersion, payload.minVersion, payload.buildNumber)) {
      return res.status(400).json({ error: 'Invalid release version or build number.' });
    }
    const release = await verifyPublishedRelease(payload.latestVersion, payload.apkUrl, payload.bundleUrl);
    if (release !== 'verified') {
      return res.status(release === 'missing' ? 409 : 503).json({ error: release === 'missing' ? 'Release asset is not published.' : 'Could not verify GitHub release. Retry later.' });
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
