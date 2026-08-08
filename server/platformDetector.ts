import type { Request, Response, NextFunction } from 'express';

export type ServerDetectedPlatform = 'android_apk' | 'google_ai_studio_preview' | 'webapp';

const TRUSTED_PREVIEW_SUFFIXES = ['.run.app', '.ai.studio', '.google.com'];
const TRUSTED_PREVIEW_HOSTS = new Set(['run.app', 'ai.studio', 'google.com']);

function parseHostname(urlOrHost: string): string | null {
  if (!urlOrHost) return null;

  try {
    return new URL(urlOrHost).hostname.toLowerCase();
  } catch {
    const normalizedHost = urlOrHost.split(',')[0]?.trim().toLowerCase();
    if (!normalizedHost) return null;
    return normalizedHost.replace(/:\d+$/, '');
  }
}

function isTrustedPreviewHostname(hostname: string | null): boolean {
  if (!hostname) return false;
  if (TRUSTED_PREVIEW_HOSTS.has(hostname)) return true;
  return TRUSTED_PREVIEW_SUFFIXES.some(suffix => hostname.endsWith(suffix));
}

function isTrustedPreviewUrl(url: string): boolean {
  return isTrustedPreviewHostname(parseHostname(url));
}

export function detectServerPlatform(req: Request): ServerDetectedPlatform {
  // 1. Check explicit client platform header
  const headerPlatform = req.headers['x-app-platform'] as string | undefined;
  if (headerPlatform === 'android_apk' || headerPlatform === 'google_ai_studio_preview' || headerPlatform === 'webapp') {
    return headerPlatform;
  }

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const origin = (req.headers['origin'] || '').toLowerCase();
  const referer = (req.headers['referer'] || '').toLowerCase();
  const host = (req.headers['host'] || '').toLowerCase();
  const secFetchDest = (req.headers['sec-fetch-dest'] || '').toLowerCase();

  // 2. Detect Android APK / Capacitor native requests
  if (
    userAgent.includes('capacitor') ||
    origin.includes('capacitor://') ||
    (origin.includes('http://localhost') && userAgent.includes('android')) ||
    origin.startsWith('file://')
  ) {
    return 'android_apk';
  }

  const trustedPreviewRequest =
    isTrustedPreviewUrl(origin) ||
    isTrustedPreviewUrl(referer) ||
    isTrustedPreviewHostname(parseHostname(host));

  // 3. Detect Google AI Studio Preview only for trusted preview origins/hosts.
  // `sec-fetch-dest=iframe` alone is not trusted input and must never disable
  // clickjacking protection by itself.
  if (trustedPreviewRequest && (secFetchDest === 'iframe' || !!origin || !!referer || !!host)) {
    return 'google_ai_studio_preview';
  }

  // 4. Default Web App
  return 'webapp';
}

export function platformOptimizerMiddleware(req: Request, res: Response, next: NextFunction) {
  const platform = detectServerPlatform(req);
  (req as any).detectedPlatform = platform;

  // Inform response header silently
  res.setHeader('X-App-Platform-Detected', platform);

  if (platform === 'android_apk') {
    // Android APK WebView optimization:
    // Ensure CORS headers allow native Capacitor origins, reduce asset overhead for API routes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App-Platform');
  } else if (platform === 'google_ai_studio_preview') {
    // Google AI Studio preview optimization:
    // Allow iframe embedding without blocking headers for trusted preview environments only.
    res.removeHeader('X-Frame-Options');
  }

  next();
}
