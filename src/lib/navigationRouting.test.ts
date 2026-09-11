import { describe, it, expect } from 'vitest';

export interface NavTabItem {
  id: string;
  path: string;
  labelEn: string;
  labelBm: string;
  adminOnly?: boolean;
}

export const APP_NAV_TABS: NavTabItem[] = [
  { id: 'home', path: '/home', labelEn: 'Home', labelBm: 'Utama' },
  { id: 'order', path: '/order', labelEn: 'Catering', labelBm: 'Tempah' },
  { id: 'calendar', path: '/calendar', labelEn: 'Calendar', labelBm: 'Kalendar' },
  { id: 'admin', path: '/admin', labelEn: 'Admin', labelBm: 'Admin', adminOnly: true },
  { id: 'profile', path: '/profile', labelEn: 'Account', labelBm: 'Akaun' },
];

export function getVisibleTabs(isAdmin: boolean): NavTabItem[] {
  return APP_NAV_TABS.filter((tab) => !tab.adminOnly || isAdmin);
}

export function getActiveTabId(pathname: string): string {
  if (pathname === '/' || pathname === '/home') return 'home';
  if (pathname.startsWith('/order')) return 'order';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/profile')) return 'profile';
  return '';
}

export const MIN_TOUCH_TARGET_PX = 44;

export function validateTouchTargetSize(widthPx: number, heightPx: number): boolean {
  return widthPx >= MIN_TOUCH_TARGET_PX && heightPx >= MIN_TOUCH_TARGET_PX;
}

describe('navigationRouting and accessibility standards', () => {
  describe('getActiveTabId', () => {
    it('maps root and /home to home tab', () => {
      expect(getActiveTabId('/')).toBe('home');
      expect(getActiveTabId('/home')).toBe('home');
    });

    it('maps /order and subroutes to order tab', () => {
      expect(getActiveTabId('/order')).toBe('order');
      expect(getActiveTabId('/order/summary')).toBe('order');
    });

    it('maps /calendar to calendar tab', () => {
      expect(getActiveTabId('/calendar')).toBe('calendar');
    });

    it('maps /admin to admin tab', () => {
      expect(getActiveTabId('/admin')).toBe('admin');
      expect(getActiveTabId('/admin/orders')).toBe('admin');
    });

    it('maps /profile to profile tab', () => {
      expect(getActiveTabId('/profile')).toBe('profile');
    });

    it('returns empty string for unrelated routes', () => {
      expect(getActiveTabId('/terms')).toBe('');
      expect(getActiveTabId('/unknown')).toBe('');
    });
  });

  describe('getVisibleTabs', () => {
    it('omits admin tab for regular user', () => {
      const tabs = getVisibleTabs(false);
      expect(tabs.some((t) => t.id === 'admin')).toBe(false);
      expect(tabs.length).toBe(4);
    });

    it('includes admin tab for admin user', () => {
      const tabs = getVisibleTabs(true);
      expect(tabs.some((t) => t.id === 'admin')).toBe(true);
      expect(tabs.length).toBe(5);
    });
  });

  describe('touch target accessibility standard compliance', () => {
    it('enforces minimum 44x44px for touch targets', () => {
      expect(validateTouchTargetSize(44, 44)).toBe(true);
      expect(validateTouchTargetSize(48, 48)).toBe(true);
      expect(validateTouchTargetSize(40, 44)).toBe(false);
      expect(validateTouchTargetSize(44, 40)).toBe(false);
    });
  });
});
