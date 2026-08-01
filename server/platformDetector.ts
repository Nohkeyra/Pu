import type { Request, Response, NextFunction } from 'express';

export type ServerDetectedPlatform = 'android_apk' | 'google_ai_studio_preview' | 'webapp';

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

  // 3. Detect Google AI Studio Preview
  if (
    secFetchDest === 'iframe' ||
    referer.includes('ai.studio') ||
    referer.includes('run.app') ||
    origin.includes('ai.studio') ||
    host.includes('run.app') ||
    host.includes('ai.studio')
  ) {
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
    // Allow iframe embedding without blocking headers
    res.removeHeader('X-Frame-Options');
  }

  next();
}
