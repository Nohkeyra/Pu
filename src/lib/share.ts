import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { safeCopyToClipboard } from '@/lib/utils';


/**
 * Live public origin of the deployed app (no trailing slash). Needed because
 * window.location.origin resolves to http://localhost inside the Capacitor
 * WebView on native builds, which is never a usable link to share.
 */
export const PROD_ORIGIN = 'https://restoran-wawasan-bio.onrender.com';

/**
 * Live public URL of the deployed order form. This is a plain web link that
 * opens in ANY browser — customers do not need the app installed. The site is
 * a HashRouter SPA, so the order form lives at the #/order route.
 */
export const ORDER_FORM_URL = `${PROD_ORIGIN}/#/order`;

/**
 * Canonical shareable URL that opens the (empty) order form so the customer
 * can fill in their own order details.
 */
export const buildOrderFormUrl = (): string => ORDER_FORM_URL;

/**
 * Resolves a shareable absolute URL for the given in-app hash route (e.g.
 * '#/order'), always pointing at the real production origin rather than
 * window.location.origin, which is unusable (http://localhost) on native.
 */
export const buildShareableUrl = (hash: string): string => `${PROD_ORIGIN}/${hash}`;

/**
 * Trigger the system's native share sheet (Android ACTION_SEND / iOS share) to
 * send the customer a link to the order form. Falls back to the Web Share API,
 * then to clipboard, when the native Capacitor Share plugin is unavailable
 * (e.g. a desktop browser).
 *
 * The customer taps the link and it opens the live order form in their browser
 * (or the app, if installed) — they enter their own details, no manual data
 * entry on your side. Order confirmation reaches them by email.
 */
export const shareOrderForm = async (
  opts?: { title?: string; message?: string }
): Promise<void> => {
  const url = buildOrderFormUrl();
  const title = opts?.title ?? 'Restoran Wawasan Pak Usop';
  const text = opts?.message ?? `Place your order here: ${url}`;

  // Preferred: native share sheet (WhatsApp, SMS, email, etc.)
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text, url, dialogTitle: 'Share order form' });
    return;
  }

  // Web fallback: Web Share API where supported
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    await (navigator as Navigator & { share: (d: ShareData) => Promise<void> })
      .share({ title, text, url });
    return;
  }

  // Last resort: copy to clipboard
  await safeCopyToClipboard(url);
};
