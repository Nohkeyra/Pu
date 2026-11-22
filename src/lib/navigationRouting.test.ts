import { describe, expect, it } from 'vitest';
import { getCustomerHomePath, getDeepLinkRoute, getNativeStartRoute } from './appEntryRoutes';

// Exercise the routing functions used by the app, not a second menu invented by this test.
describe('app entry policy', () => {
  it.each([
    [false, false, '/login'], [true, false, '/app'],
    [false, true, '/admin'], [true, true, '/admin'],
  ] as const)('customer=%s admin=%s enters %s', (customer, admin, expected) => {
    expect(getNativeStartRoute(customer, admin)).toBe(expected);
  });
  it.each([
    [false, false, '/'], [true, false, '/app'],
    [false, true, '/app'], [true, true, '/app'],
  ] as const)('native=%s signed-in=%s has home %s', (native, member, expected) => {
    expect(getCustomerHomePath(native, member)).toBe(expected);
  });
});

describe('manifest-backed deep links', () => {
  it.each([
    ['wawasan://app/order', '/order'],
    ['wawasanpakusop://app/profile', '/profile'],
    ['wawasan://app', '/'],
    ['wawasan://app/order?from=notification#details', '/order?from=notification#details'],
    ['https://restoran-wawasan-bio.onrender.com/#/order?from=link', '/order?from=link'],
    ['https://wawasan.web.app/calendar?month=2026-12', '/calendar?month=2026-12'],
    ['https://restoran-wawasan.pxxl.click/settings', '/settings'],
  ])('routes %s to %s', (url, expected) => expect(getDeepLinkRoute(url)).toBe(expected));
  it.each([
    'not a URL', 'javascript:alert(1)', 'wawasan://unrecognized/order',
    'https://untrusted.invalid/order', 'https://wawasan.web.app.evil.invalid/order',
    'https://wawasan.web.app/unknown', 'https://wawasan.web.app/#/admin/unknown',
  ])('ignores unsupported URL %s', url => expect(getDeepLinkRoute(url)).toBeNull());
});
