import { Router, type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import URL from 'url';
import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.ts';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

// List of trusted/allowed referer domains for anti-hotlinking
const TRUSTED_REFERER_DOMAINS = new Set([
  'aistudio.google.com',
  'ai.studio',
  'restoran-wawasan-bio.onrender.com',
  'restoran-wawasan.pxxl.click',
  'localhost',
  '127.0.0.1',
]);

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

const imageProxyLimiter = createDistributedRateLimiter({
  prefix: 'image_proxy',
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many image proxy requests.' },
});

/**
 * Validates if a Referer header is authorized or allowed.
 * Direct requests (no Referer) are allowed (e.g. mobile apps, browser address bar, cURL).
 */
export function isAllowedReferer(refererHeader: string | undefined, originHeader: string | undefined): boolean {
  const referer = refererHeader || originHeader;
  if (!referer) return true; // Allow direct access

  try {
    const parsed = new URL.URL(referer);
    const hostname = parsed.hostname.toLowerCase();

    if (TRUSTED_REFERER_DOMAINS.has(hostname)) return true;
    // S-6 fix: wildcard *.onrender.com / *.run.app removed; only the known production host is trusted.
    if (hostname === 'restoran-wawasan-bio.onrender.com') return true;
    if (hostname.endsWith('.aistudio.google.com')) return true;

    return false;
  } catch {
    // An invalid Referer/Origin cannot establish an allowed site.
    return false;
  }
}

/**
 * Express Middleware for Anti-Hotlink Protection on static image assets
 */
export function antiHotlinkGuard(req: Request, res: Response, next: NextFunction) {
  const isImageRequest = /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(req.path);
  if (!isImageRequest) {
    return next();
  }

  const referer = req.headers['referer'] as string | undefined;
  const origin = req.headers['origin'] as string | undefined;

  if (!isAllowedReferer(referer, origin)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Anti-Hotlink-Protected', 'true');
    return res.status(403).send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
        <rect width="100%" height="100%" fill="#1c1917" rx="16"/>
        <rect x="10" y="10" width="380" height="180" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,6" rx="12"/>
        <text x="200" y="70" font-family="sans-serif" font-weight="900" font-size="20" fill="#f59e0b" text-anchor="middle">
          PROTECTED ASSET
        </text>
        <text x="200" y="105" font-family="sans-serif" font-weight="bold" font-size="14" fill="#ffffff" text-anchor="middle">
          Restoran Wawasan Pak Usop
        </text>
        <text x="200" y="135" font-family="sans-serif" font-size="11" fill="#a8a29e" text-anchor="middle">
          Hotlinking is disabled for external sites.
        </text>
        <text x="200" y="160" font-family="sans-serif" font-size="10" fill="#f59e0b" text-anchor="middle">
          restoran-wawasan.pxxl.click
        </text>
      </svg>
    `);
  }

  next();
}

/**
 * Checks whether an IPv4 or IPv6 address is private, loopback, link-local, or reserved.
 */
function isPrivateOrReservedIp(ip: string): boolean {
  let cleanIp = ip;
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [a, b] = parts;

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 protocol assignments
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
    if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
    if (a === 192 && b === 88 && parts[2] === 99) return true; // IPv6 relay anycast
    if (a === 255) return true; // broadcast
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a >= 224) return true; // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved / Broadcast

    return false;
  }

  if (net.isIPv6(cleanIp)) {
    const lower = cleanIp.toLowerCase();
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:0' || lower === '0:0:0:0:0:0:0:1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 Unique Local
    if (lower.startsWith('2001:db8:') || lower === '2001:db8::') return true; // documentation range
    if (lower.startsWith('2001:') && /^2001:(?:0|0000):/i.test(lower)) return true; // Teredo/special use
    if (lower.startsWith('64:ff9b:1:')) return true; // local-use IPv4 translation prefix
    if (lower.startsWith('::ffff:')) return true; // reject mapped form unless canonical IPv4 parser handles it
    if (/^fe[89ab]/i.test(lower)) return true; // fe80::/10 Link Local
    return false;
  }

  return true;
}

/**
 * SSRF Security Checker:
 * Validates protocol, hostname, and resolves DNS to ensure target does not map to private/internal IPs.
 */
export async function isSafeUrl(urlStr: string): Promise<{ safe: boolean; parsedUrl?: URL.URL; resolvedAddress?: string }> {
  try {
    const parsed = new URL.URL(urlStr);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) {
      return { safe: false };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan')
    ) {
      return { safe: false };
    }

    let resolvedAddress = hostname;
    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) return { safe: false };
    } else {
      const lookups = await dns.promises.lookup(hostname, { all: true });
      if (!lookups || lookups.length === 0 || lookups.some(addr => isPrivateOrReservedIp(addr.address))) {
        return { safe: false };
      }
      resolvedAddress = lookups[0].address;
    }

    return { safe: true, parsedUrl: parsed, resolvedAddress };
  } catch {
    return { safe: false };
  }
}

/**
 * Finds the best local fallback vector/photo image file for dish repair.
 */
export function getLocalFallbackImagePath(dishHint?: string, categoryHint?: string): string {
  const publicDir = path.join(process.cwd(), 'public');
  const dish = (dishHint || '').toLowerCase();
  const category = (categoryHint || '').toLowerCase();

  // 1. Check Drinks
  if (
    category === 'drink' ||
    category === 'drinks' ||
    dish.includes('drink') ||
    dish.includes('teh') ||
    dish.includes('kopi') ||
    dish.includes('sirap') ||
    dish.includes('milo') ||
    dish.includes('water')
  ) {
    if (dish.includes('bandung')) return path.join(publicDir, 'assets/drinks/sirap_bandung.jpg');
    if (dish.includes('limau')) return path.join(publicDir, 'assets/drinks/sirap_limau_vector.jpg');
    if (dish.includes('milo')) return path.join(publicDir, 'assets/drinks/milo_vector.jpg');
    if (dish.includes('kopi')) return path.join(publicDir, 'assets/drinks/kopi_kampung_vector.jpg');
    if (dish.includes('jus') || dish.includes('oren')) return path.join(publicDir, 'assets/drinks/jus_oren_vector.jpg');
    if (dish.includes('mineral') || dish.includes('water')) return path.join(publicDir, 'assets/drinks/mineral_water_vector.jpg');
    return path.join(publicDir, 'assets/drinks/teh_tarik.jpg');
  }

  // 2. Check Specific Dishes
  if (dish.includes('asam_pedas') || dish.includes('pari')) return path.join(publicDir, 'assets/dishes/vector/asam_pedas.jpg');
  if (dish.includes('lontong')) return path.join(publicDir, 'assets/dishes/vector/lontong.jpg');
  if (dish.includes('laksa')) return path.join(publicDir, 'assets/dishes/vector/laksa_johor.jpg');
  if (dish.includes('soto')) return path.join(publicDir, 'assets/dishes/vector/soto_ayam.jpg');
  if (dish.includes('briyani') || dish.includes('minyak') || dish.includes('tomato')) return path.join(publicDir, 'assets/dishes/vector/nasi_briyani.jpg');
  if (dish.includes('rendang') || dish.includes('daging')) return path.join(publicDir, 'assets/dishes/vector/rendang_daging.jpg');
  if (dish.includes('ayam')) return path.join(publicDir, 'assets/dishes/vector/ayam_berempah.jpg');
  if (dish.includes('udang') || dish.includes('sotong')) return path.join(publicDir, 'assets/dishes/vector/sambal_udang.jpg');
  if (dish.includes('keli') || dish.includes('ikan')) return path.join(publicDir, 'assets/dishes/vector/ikan_keli.jpg');
  if (dish.includes('roti') || dish.includes('canai')) return path.join(publicDir, 'assets/dishes/vector/roti_canai.jpg');
  if (dish.includes('kuih') || dish.includes('pisang')) return path.join(publicDir, 'assets/dishes/vector/kuih_muih.jpg');

  // Default Fallback
  return path.join(publicDir, 'assets/dishes/vector/nasi_lemak.jpg');
}

// Resolve both the requested file and its asset directory so symlinks cannot
// turn a public image request into a read outside the permitted directory.
export async function getSafeLocalImagePath(assetPath: string): Promise<string | null> {
  if (!(assetPath.startsWith('/assets/') || assetPath.startsWith('/photos/'))
      || assetPath.includes('\\') || assetPath.includes('\0')
      || assetPath.split('/').includes('..')
      || !/\.(?:jpe?g|png|webp|gif|svg|avif|ico)$/i.test(assetPath)) {
    return null;
  }

  const isWithin = (directory: string, file: string): boolean => {
    const relative = path.relative(directory, file);
    return relative !== '' && relative !== '..'
      && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };

  try {
    const publicDir = await fs.promises.realpath(path.join(process.cwd(), 'public'));
    const assetDir = await fs.promises.realpath(path.join(publicDir, assetPath.split('/')[1]));
    if (!isWithin(publicDir, assetDir)) return null;

    const candidate = path.resolve(publicDir, assetPath.slice(1));
    if (!isWithin(assetDir, candidate)) return null;

    const localPath = await fs.promises.realpath(candidate);
    if (!isWithin(assetDir, localPath)) return null;
    const stat = await fs.promises.stat(localPath);
    return stat.isFile() ? localPath : null;
  } catch {
    // Missing, inaccessible, or invalid paths use the normal image fallback.
    return null;
  }
}

// Read remote images through a socket pinned to the IP validated by isSafeUrl.
// Each redirect is validated and pinned independently. Never forward cookies or auth.
function fetchPinnedImage(parsedUrl: URL.URL, address: string): Promise<{
  status: number; location?: string; mimeType?: string; buffer: Buffer;
} | null> {
  const MAX_BYTES = 10 * 1024 * 1024;
  return new Promise(resolve => {
    const requestFn = parsedUrl.protocol === 'https:' ? https.request : http.request;
    const req = requestFn(parsedUrl, {
      method: 'GET',
      lookup: (_hostname, options, callback) => {
        const family = net.isIP(address);
        if (options.all) callback(null, [{ address, family }]);
        else callback(null, address, family);
      },
      headers: {
        'User-Agent': 'RestoranWawasanImageProxy/1.0',
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml',
      },
      timeout: 3500,
    }, response => {
      const status = response.statusCode || 0;
      const location = typeof response.headers.location === 'string' ? response.headers.location : undefined;
      const mimeType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const length = Number(response.headers['content-length']);
      if ((status >= 300 && status < 400) || status < 200 || status >= 300 || !ALLOWED_IMAGE_TYPES.has(mimeType) || (Number.isFinite(length) && length > MAX_BYTES)) {
        response.resume();
        resolve({ status, location, mimeType, buffer: Buffer.alloc(0) });
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      response.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_BYTES) {
          req.destroy(new Error('Image exceeds size limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ status, mimeType, buffer: Buffer.concat(chunks) }));
      response.on('error', () => resolve(null));
    });
    req.on('timeout', () => req.destroy(new Error('Image fetch timeout')));
    req.on('error', () => resolve(null));
    req.end();
  });
}

/**
 * Route: Image Proxy & Auto-Repair Endpoint
 * GET /api/images/proxy?url=<encoded_url>&dish=<dish_id>&category=<category>
 */
router.get('/images/proxy', imageProxyLimiter, async (req: Request, res: Response) => {
  const targetUrl = typeof req.query.url === 'string' ? req.query.url : undefined;
  const dish = typeof req.query.dish === 'string' ? req.query.dish : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  const serveRepairedFallback = () => {
    if (req.query.noFallback === '1') return res.status(404).send('Image not available');
    const fallbackPath = getLocalFallbackImagePath(dish, category);
    if (fs.existsSync(fallbackPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Image-Repaired', 'true');
      res.setHeader('X-Image-Source', 'local-vector-fallback');
      return fs.createReadStream(fallbackPath).pipe(res);
    }
    return res.status(404).send('Image not available');
  };

  // If no target URL or it's a relative asset path, serve local fallback or file directly
  if (!targetUrl || !targetUrl.startsWith('http')) {
    const localPath = targetUrl ? await getSafeLocalImagePath(targetUrl) : null;
    if (localPath) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Image-Repaired', 'false');
      return res.sendFile(localPath, (err) => {
        if (err) {
          if (res.headersSent) res.destroy();
          else res.status(404).end();
        }
      });
    }
    return serveRepairedFallback();
  }

  try {
    let currentUrl = targetUrl;
    let image: { buffer: Buffer; mimeType: string } | null = null;
    const maxRedirects = 3;

    for (let hop = 0; hop <= maxRedirects; hop++) {
      const { safe, parsedUrl, resolvedAddress } = await isSafeUrl(currentUrl);
      if (!safe || !parsedUrl || !resolvedAddress) return serveRepairedFallback();

      // Pin the already-validated DNS result to the actual socket. Native fetch
      // would resolve the hostname again, leaving a DNS rebinding window.
      const fetched = await fetchPinnedImage(parsedUrl, resolvedAddress);
      if (!fetched) return serveRepairedFallback();
      if (fetched.status >= 300 && fetched.status < 400) {
        const location = fetched.location;
        if (!location || hop === maxRedirects) return serveRepairedFallback();
        currentUrl = new URL.URL(location, currentUrl).toString();
        continue;
      }
      if (fetched.status < 200 || fetched.status >= 300 || !fetched.mimeType || !ALLOWED_IMAGE_TYPES.has(fetched.mimeType)) {
        return serveRepairedFallback();
      }
      image = { buffer: fetched.buffer, mimeType: fetched.mimeType };
      break;
    }

    if (!image || image.buffer.length === 0) return serveRepairedFallback();
    const { buffer, mimeType } = image;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Image-Repaired', 'false');
    res.setHeader('X-Image-Proxy-Success', 'true');
    return res.send(buffer);
  } catch {
    return serveRepairedFallback();
  }
});

let menuHealthCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const MENU_HEALTH_CACHE_TTL_MS = 60 * 1000;

export function invalidateMenuHealthCache(): void {
  menuHealthCache = null;
}

/**
 * Route: Image Health Diagnostic Check
 * GET /api/images/health
 */
router.get('/images/health', verifyAdminToken, async (_req: Request, res: Response) => {
  try {
    if (menuHealthCache && menuHealthCache.expiresAt > Date.now()) {
      return res.json(menuHealthCache.data);
    }

    const db = getFirestore();
    let menuItems = DEFAULT_MENU_ITEMS;

    try {
      const snap = await db.collection('menu').get();
      if (!snap.empty) {
        menuItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      }
    } catch {
      // Use defaults if Firestore fails
    }

    const results = [];
    let healthyCount = 0;
    let repairedCount = 0;

    const publicDir = path.join(process.cwd(), 'public');

    for (const item of menuItems) {
      const imgPath = item.image || '';
      let status: 'healthy' | 'repaired' | 'missing' = 'healthy';
      let resolvedPath = imgPath;

      if (!imgPath) {
        status = 'repaired';
        resolvedPath = getLocalFallbackImagePath(item.id, item.category);
        repairedCount++;
      } else if (imgPath.startsWith('/assets/') || imgPath.startsWith('/public/')) {
        const cleanPath = imgPath.replace(/^\/(public|assets)/, 'assets');
        const localFile = path.join(publicDir, cleanPath);
        if (fs.existsSync(localFile)) {
          status = 'healthy';
          healthyCount++;
        } else {
          status = 'repaired';
          resolvedPath = getLocalFallbackImagePath(item.id, item.category);
          repairedCount++;
        }
      } else if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
        status = 'repaired';
        repairedCount++;
      } else {
        status = 'repaired';
        resolvedPath = getLocalFallbackImagePath(item.id, item.category);
        repairedCount++;
      }

      results.push({
        id: item.id,
        nameEn: item.nameEn,
        nameBm: item.nameBm,
        originalImage: imgPath,
        resolvedImage: resolvedPath,
        status,
      });
    }

    const responsePayload = {
      success: true,
      summary: {
        total: menuItems.length,
        healthy: healthyCount,
        repaired: repairedCount,
        protection: 'Active Anti-Hotlink Guard & Server-Side Image Repair Proxy',
      },
      items: results,
    };

    menuHealthCache = {
      data: responsePayload,
      expiresAt: Date.now() + MENU_HEALTH_CACHE_TTL_MS,
    };

    return res.json(responsePayload);
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * Route: Admin Bulk Auto-Repair Menu Images
 * POST /api/admin/menu/repair-images
 */
router.post('/admin/menu/repair-images', verifyAdminToken, async (_req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('menu').get();

    if (snap.empty) {
      return res.json({ success: true, repairedCount: 0, message: 'No menu items in Firestore to repair.' });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const BATCH_LIMIT = 400;
    let currentBatch = db.batch();
    let currentBatchOps = 0;
    let repairedCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const currentImg = data.image || '';

      let needsRepair = false;
      let newImg = currentImg;

      if (!currentImg) {
        needsRepair = true;
      } else if (currentImg.startsWith('/assets/')) {
        const fullPath = path.join(publicDir, currentImg.replace('/assets/', 'assets/'));
        if (!fs.existsSync(fullPath)) {
          needsRepair = true;
        }
      }

      if (needsRepair) {
        const fallback = getLocalFallbackImagePath(doc.id || data.nameEn, data.category);
        const relativeAsset = fallback.substring(publicDir.length).replace(/\\/g, '/');
        newImg = relativeAsset.startsWith('/') ? relativeAsset : `/${relativeAsset}`;

        currentBatch.update(doc.ref, {
          image: newImg,
          updatedAt: new Date().toISOString(),
        });
        repairedCount++;
        currentBatchOps++;

        if (currentBatchOps >= BATCH_LIMIT) {
          await currentBatch.commit();
          currentBatch = db.batch();
          currentBatchOps = 0;
        }
      }
    }

    if (currentBatchOps > 0) {
      await currentBatch.commit();
    }

    invalidateMenuHealthCache();

    return res.json({
      success: true,
      repairedCount,
      message: `Successfully audited and repaired ${repairedCount} menu item image paths.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;


