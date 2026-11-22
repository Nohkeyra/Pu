/** Routing policy: public website retains the landing page; APK has an auth entry. */
export function getNativeStartRoute(hasCustomerSession: boolean, hasAdminSession: boolean): '/admin' | '/app' | '/login' {
  if (hasAdminSession) return '/admin';
  return hasCustomerSession ? '/app' : '/login';
}

export function getCustomerHomePath(isNative: boolean, isSignedIn: boolean): '/app' | '/' {
  return isNative || isSignedIn ? '/app' : '/';
}

const DEEP_LINK_ROUTES = new Set(['/order', '/admin', '/login', '/profile', '/settings', '/calendar', '/home', '/app', '/']);
const APP_LINK_HOSTS = new Set(['restoran-wawasan-bio.onrender.com', 'restoran-wawasan.pxxl.click', 'wawasan.web.app', 'wawasanhub.vercel.app']);

/** Parse the schemes/hosts used by AndroidManifest without adding the scheme host to the route. */
export function getDeepLinkRoute(value: string): string | null {
  try {
    const url = new URL(value);
    const customScheme = url.protocol === 'wawasan:' || url.protocol === 'wawasanpakusop:';
    if (customScheme ? url.host !== 'app' : url.protocol !== 'https:' || !APP_LINK_HOSTS.has(url.hostname)) return null;
    const inner = url.hash.startsWith('#/') ? new URL(url.hash.slice(1), 'https://app.local') : null;
    const pathname = inner?.pathname || url.pathname || '/';
    if (!DEEP_LINK_ROUTES.has(pathname)) return null;
    const search = inner?.search || url.search;
    const hash = inner?.hash || (inner ? '' : url.hash);
    return pathname + search + hash;
  } catch {
    return null;
  }
}
