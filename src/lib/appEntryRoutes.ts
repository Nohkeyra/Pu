/** Routing policy: public website retains the landing page; APK has an auth entry. */
export function getNativeStartRoute(hasCustomerSession: boolean, hasAdminSession: boolean): '/admin' | '/app' | '/login' {
  if (hasAdminSession) return '/admin';
  return hasCustomerSession ? '/app' : '/login';
}

export function getCustomerHomePath(isNative: boolean, isSignedIn: boolean): '/app' | '/' {
  return isNative || isSignedIn ? '/app' : '/';
}
