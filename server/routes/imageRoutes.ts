import { Router, type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import URL from 'url';
import dns from 'dns';
import net from 'net';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

// List of trusted/allowed referer domains for anti-hotlinking
const TRUSTED_REFERER_DOMAINS = new Set([
  'aistudio.google.com',
  'ai.studio',
  'claude.ai',
  'anthropic.com',
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
    if (hostname.endsWith('.onrender.com')) return true;
    if (hostname.endsWith('.run.app')) return true;
    if (hostname.endsWith('.aistudio.google.com')) return true;
    if (hostname.endsWith('.claude.ai')) return true;

    return false;
  } catch {
    return true; // If unparseable, default to allow to avoid breaking obscure clients
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
    if (/^fe[89ab]/i.test(lower)) return true; // fe80::/10 Link Local
    return false;
  }

  return true;
}

/**
 * SSRF Security Checker:
 * Validates protocol, hostname, and resolves DNS to ensure target does not map to private/internal IPs.
 */
export async function isSafeUrl(urlStr: string): Promise<{ safe: boolean; parsedUrl?: URL.URL }> {
  try {
    const parsed = new URL.URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
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

    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) {
        return { safe: false };
      }
    } else {
      const lookups = await dns.promises.lookup(hostname, { all: true });
      if (!lookups || lookups.length === 0) {
        return { safe: false };
      }
      for (const addr of lookups) {
        if (isPrivateOrReservedIp(addr.address)) {
          return { safe: false };
        }
      }
    }

    return { safe: true, parsedUrl: parsed };
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

/**
 * Route: Image Proxy & Auto-Repair Endpoint
 * GET /api/images/proxy?url=<encoded_url>&dish=<dish_id>&category=<category>
 */
router.get('/images/proxy', imageProxyLimiter, async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string | undefined;
  const dish = req.query.dish as string | undefined;
  const category = req.query.category as string | undefined;

  const serveRepairedFallback = () => {
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
    if (targetUrl && (targetUrl.startsWith('/assets/') || targetUrl.startsWith('/photos/'))) {
      const localPath = path.join(process.cwd(), 'public', targetUrl.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Image-Repaired', 'false');
        return fs.createReadStream(localPath).pipe(res);
      }
    }
    return serveRepairedFallback();
  }

  try {
    let currentUrl = targetUrl;
    let response: globalThis.Response | null = null;
    const maxRedirects = 3;

    for (let hop = 0; hop <= maxRedirects; hop++) {
      const { safe, parsedUrl } = await isSafeUrl(currentUrl);
      if (!safe || !parsedUrl) {
        return serveRepairedFallback();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const fetchRes = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
          },
        });
        clearTimeout(timeoutId);

        if (fetchRes.status >= 300 && fetchRes.status < 400) {
          const location = fetchRes.headers.get('location');
          if (!location) {
            return serveRepairedFallback();
          }
          currentUrl = new URL.URL(location, currentUrl).toString();
          continue;
        }

        response = fetchRes;
        break;
      } catch {
        clearTimeout(timeoutId);
        return serveRepairedFallback();
      }
    }

    if (!response || !response.ok) {
      return serveRepairedFallback();
    }

    const rawContentType = (response.headers.get('content-type') || '').toLowerCase();
    const mimeType = rawContentType.split(';')[0].trim();

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return serveRepairedFallback();
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && parseInt(contentLengthHeader, 10) > 10 * 1024 * 1024) {
      return serveRepairedFallback();
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      return serveRepairedFallback();
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Image-Repaired', 'false');
    res.setHeader('X-Image-Proxy-Success', 'true');
    return res.send(buffer);
  } catch {
    return serveRepairedFallback();
  }
});

/**
 * Route: Image Health Diagnostic Check
 * GET /api/images/health
 */
router.get('/images/health', verifyAdminToken, async (_req: Request, res: Response) => {
  try {
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

    return res.json({
      success: true,
      summary: {
        total: menuItems.length,
        healthy: healthyCount,
        repaired: repairedCount,
        protection: 'Active Anti-Hotlink Guard & Server-Side Image Repair Proxy',
      },
      items: results,
    });
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
    const batch = db.batch();
    let repairedCount = 0;

    snap.docs.forEach((doc) => {
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

        batch.update(doc.ref, {
          image: newImg,
          updatedAt: new Date().toISOString(),
        });
        repairedCount++;
      }
    });

    if (repairedCount > 0) {
      await batch.commit();
    }

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
