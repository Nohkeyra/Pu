import fs from 'node:fs';
import { jsPDF } from 'jspdf';
import { test, expect, type Page } from '@playwright/test';
import type { Order } from '../src/types';

async function setupCommonRoutes(
  page: Page,
  options: {
    simulateCustomer?: boolean;
    verifiedCustomer?: boolean;
    recoverProfileHistory?: boolean;
    customerOrders?: Array<Partial<Order> & { id: string; userId: string }>;
    startSignedOut?: boolean;
    adminVerified?: boolean;
  } = {}
) {
  page.on('pageerror', error => console.error('Account fixture:', error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // Native API URLs are absolute. Let them reach the fixture responses below,
    // while continuing to abort external assets. Every /api/ request is fulfilled
    // locally; no request is continued to a real backend.
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.pathname.startsWith('/api/')) return route.abort();

    if (options.simulateCustomer) {
      if (url.pathname === '/src/firebaseConfig.ts') {
        return route.fulfill({
          contentType: 'application/javascript',
          body: `
            const listeners = new Set();
            const mockUser = {
              uid: 'cust_e2e_1',
              email: 'pelanggan.ujian@example.com',
              displayName: 'Pelanggan Ujian',
              emailVerified: ${options.verifiedCustomer === true},
              reload: async () => {},
              providerData: [{ providerId: 'password' }],
              getIdToken: async () => 'e2e-mock-token',
            };
            export const isNative = false;
            export const isWorkspace = true;
            export const app = {};
            export const db = {};
            export const analytics = null;
            export const auth = {
              currentUser: ${options.startSignedOut === true} ? null : mockUser,
              __mockUser: mockUser,
              __listeners: listeners,
              __setUser(next) {
                this.currentUser = next;
                for (const cb of listeners) cb(next);
              },
            };
            export default function getApp() { return app; }
          `,
        });
      }

      if (url.pathname.includes('firebase_auth')) {
        return route.fulfill({
          contentType: 'application/javascript',
          body: `
            window.__e2eDeleteEvents = window.__e2eDeleteEvents || [];
            export const EmailAuthProvider = {
              credential: (email, password) => ({ providerId: 'password', email, password }),
            };
            export class GoogleAuthProvider {
              setCustomParameters() {}
              static credential() { return { providerId: 'google.com' }; }
            }
            export class OAuthProvider { constructor(id) { this.providerId = id; } }
            export function onAuthStateChanged(auth, cb) {
              auth.__listeners?.add(cb);
              const t = setTimeout(() => cb(auth.currentUser), 0);
              return () => { clearTimeout(t); auth.__listeners?.delete(cb); };
            }
            export function onIdTokenChanged(auth, cb) {
              return onAuthStateChanged(auth, cb);
            }
            export async function reauthenticateWithCredential(_user, cred) {
              window.__e2eDeleteEvents.push('reauthenticate:' + cred.password);
              if (cred.password !== 'KataLaluanBetul123!') {
                const err = new Error('auth/invalid-credential');
                err.code = 'auth/invalid-credential';
                throw err;
              }
              return { user: _user };
            }
            export async function reauthenticateWithPopup(user) {
              return { user };
            }
            export async function deleteUser(user) {
              window.__e2eDeleteEvents.push('deleteUser:' + user.uid);
            }
            export async function signOut(auth) {
              window.__e2eDeleteEvents.push('signOut');
              auth.__setUser?.(null);
            }
            export async function signInWithEmailAndPassword(auth, _email, password) {
              if (password !== 'SyntheticPass123!') {
                const error = new Error('Invalid fixture credentials');
                error.code = 'auth/invalid-credential';
                throw error;
              }
              auth.__setUser(auth.__mockUser);
              return { user: auth.currentUser };
            }
            export async function createUserWithEmailAndPassword() { return {}; }
            export async function sendPasswordResetEmail() {}
            export async function sendEmailVerification() {}
            export async function signInWithCustomToken() { return {}; }
            export async function signInWithCredential() { return {}; }
            export async function signInWithPopup() { return {}; }
            export async function linkWithCredential() { return {}; }
            export async function linkWithPopup() { return {}; }
          `,
        });
      }

      if (url.pathname.includes('firebase_firestore')) {
        return route.fulfill({
          contentType: 'application/javascript',
          body: `
            window.__e2eDeleteEvents = window.__e2eDeleteEvents || [];
            export function doc(_db, col, id) { return { path: col + '/' + id }; }
            export function collection(_db, col) { return { col }; }
            export function where(field, op, val) { return { field, op, val }; }
            export function query(col, clause) { return { col, clause }; }
            export async function getDoc() { return { exists: () => false, data: () => ({}) }; }
            export async function getDocs(q) {
              const colName = q?.col?.col || '';
              if (colName === 'calendar_notes') {
                return { docs: [{ ref: { path: 'calendar_notes/cust_e2e_1_2026-12-01' } }] };
              }
              if (colName === 'company_presets') {
                return { docs: [{ ref: { path: 'company_presets/preset_e2e_1' } }] };
              }
              return { docs: [] };
            }
            export function writeBatch() {
              const ops = [];
              return {
                delete(ref) { ops.push('deleteDoc:' + ref.path); },
                async commit() { window.__e2eDeleteEvents.push(...ops); },
              };
            }
            export async function deleteDoc(ref) {
              window.__e2eDeleteEvents.push('deleteDoc:' + ref.path);
            }
            export async function setDoc() {}
            export async function updateDoc() {}
            let historyRequests = 0;
            export function onSnapshot(source, next, fail) {
              if (source?.col?.col !== 'orders') return () => {};
              if (!source.clause && ${options.adminVerified === true}) {
                const timer = setTimeout(() => next({ forEach() {} }), 0);
                return () => clearTimeout(timer);
              }
              if (source.clause?.field !== 'userId') return () => {};
              const simulateError = ${options.recoverProfileHistory === true} && historyRequests++ === 0;
              const fixtures = ${JSON.stringify(options.customerOrders ?? [])};
              const ownedOrders = fixtures.filter(order => order.userId === source.clause.val);
              const timer = setTimeout(() => {
                if (simulateError) fail(new Error('Simulated profile history outage'));
                else next({ forEach: callback => ownedOrders.forEach(order => callback({ id: order.id, data: () => order })) });
              }, 250);
              return () => clearTimeout(timer);
            }
          `,
        });
      }
    }

    if (url.pathname === '/api/admin/verify') {
      return route.fulfill({
        status: options.adminVerified ? 200 : 401,
        json: options.adminVerified
          ? { success: true, verified: true, admin: true, user: { admin: true, uid: 'admin' } }
          : { success: false, error: 'Unauthorized' },
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return route.fulfill({
        status: 200,
        json: { success: true, orders: [], sessions: {}, items: [], menuItems: [], settings: {} },
      });
    }

    return route.continue();
  });
}

async function seedAppStorage(
  page: Page,
  options: { language?: 'bm' | 'en'; theme?: 'light' | 'dark'; isAdmin?: boolean } = {}
) {
  await page.addInitScript(({ language = 'bm', theme = 'light', isAdmin = false }) => {
    localStorage.setItem('wawasan_language', language);
    localStorage.setItem('app_theme', theme);
    localStorage.setItem('CapacitorStorage.app_theme', theme);
    localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    localStorage.setItem('wawasan_order_tip_dismissed_v1', '1');
    sessionStorage.setItem('wawasan_session_started', 'true');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    if (isAdmin) {
      const adminTokenFixture = 'eyJhbGciOiJub25lIn0.eyJ1aWQiOiJhZG1pbiIsImFkbWluIjp0cnVlfQ.e2e_sig';
      localStorage.setItem('wawasan_admin_token', adminTokenFixture);
      localStorage.setItem('CapacitorStorage.wawasan_admin_token', adminTokenFixture);
      localStorage.setItem('wawasan_admin_authenticated', 'true');
    } else {
      localStorage.removeItem('wawasan_admin_token');
      localStorage.removeItem('CapacitorStorage.wawasan_admin_token');
      localStorage.removeItem('wawasan_admin_authenticated');
    }
  }, options);
}

const nativeWelcomeKey = 'wawasan_native_welcome_completed_v1';

// Use the actual Capacitor platform detection and preference client with a local Android bridge.
async function seedNativeLaunch(page: Page, options: {
  completed?: boolean;
  pauseSplash?: boolean;
  stallWelcomeRead?: boolean;
  failWelcomeWrite?: boolean;
} = {}) {
  await page.addInitScript(({ key, completed, pauseSplash, stallWelcomeRead, failWelcomeWrite }) => {
    if (completed) localStorage.setItem(`CapacitorStorage.${key}`, 'true');
    Object.assign(window, {
      androidBridge: {},
      Capacitor: {
        PluginHeaders: [
          { name: 'Preferences', methods: ['get', 'set', 'remove'].map(name => ({ name, rtype: 'promise' })) },
          { name: 'SplashScreen', methods: [{ name: 'hide', rtype: 'promise' }] },
        ],
        nativePromise: async (plugin: string, method: string, input?: { key: string; value: string }) => {
          if (plugin === 'SplashScreen') {
            if (!pauseSplash) return;
            return new Promise<void>(resolve => Object.assign(window, { __finishStartupSplash: resolve }));
          }
          if (!input) return;
          const storageKey = `CapacitorStorage.${input.key}`;
          if (method === 'get') {
            if (stallWelcomeRead && input.key === key) return new Promise(() => {});
            return { value: localStorage.getItem(storageKey) };
          }
          if (method === 'remove') localStorage.removeItem(storageKey);
          if (method === 'set') {
            if (failWelcomeWrite && input.key === key) throw new Error('Fixture preference write failed');
            localStorage.setItem(storageKey, input.value);
          }
        },
      },
    });
  }, { ...options, key: nativeWelcomeKey });
}

async function measureButtonContrast(locator: ReturnType<Page['locator']>): Promise<number> {
  return locator.evaluate((el) => {
    const toRgba = (cssColor: string): [number, number, number, number] => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = cssColor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };

    const blendOver = (
      fg: [number, number, number, number],
      bg: [number, number, number]
    ): [number, number, number] => [
      Math.round(fg[0] * fg[3] + bg[0] * (1 - fg[3])),
      Math.round(fg[1] * fg[3] + bg[1] * (1 - fg[3])),
      Math.round(fg[2] * fg[3] + bg[2] * (1 - fg[3])),
    ];

    const stack: Element[] = [];
    let cur: Element | null = el;
    while (cur) {
      stack.unshift(cur);
      cur = cur.parentElement;
    }

    let bg: [number, number, number] = [255, 255, 255];
    for (const node of stack) {
      const nodeBg = toRgba(getComputedStyle(node).backgroundColor);
      if (nodeBg[3] > 0) {
        bg = blendOver(nodeBg, bg);
      }
    }

    const fgRgba = toRgba(getComputedStyle(el).color);
    const fg = blendOver(fgRgba, bg);

    const lum = (rgb: [number, number, number]) =>
      rgb
        .map((c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        })
        .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);

    const l1 = lum(fg);
    const l2 = lum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
}

const fallbackHeadlessShell = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const defaultExpectedShell =
  '/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';

test.use({
  reducedMotion: 'reduce',
  ...(!fs.existsSync(defaultExpectedShell) && fs.existsSync(fallbackHeadlessShell)
    ? { launchOptions: { executablePath: fallbackHeadlessShell } }
    : {}),
});

test('delete account button is not shown to guest accounts', async ({ page }) => {
  await setupCommonRoutes(page, { adminVerified: false });
  await seedAppStorage(page, { language: 'bm', theme: 'light', isAdmin: false });
  await page.goto('/#/settings');
  await expect(page.locator('#settings-account')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Semuanya dalam satu akaun')).toBeVisible();
  await expect(page.getByRole('button', { name: /Padam Akaun|Delete Account/i })).toHaveCount(0);
});

test('delete account button is not shown to admin accounts', async ({ page }) => {
  await setupCommonRoutes(page, { adminVerified: true });
  await seedAppStorage(page, { language: 'bm', theme: 'light', isAdmin: true });
  await page.goto('/#/settings');
  await expect(page.locator('#settings-account')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Pentadbir Wawasan')).toBeVisible();
  await expect(page.getByRole('button', { name: /Padam Akaun|Delete Account/i })).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: theme-aligned Delete Account button meets touch target, WCAG AA contrast and 320px responsiveness`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await setupCommonRoutes(page, { simulateCustomer: true });
    await seedAppStorage(page, { language: 'bm', theme });

    await page.goto('/#/settings');
    const deleteBtn = page.getByRole('button', { name: 'Padam Akaun', exact: true });
    await expect(deleteBtn).toBeVisible({ timeout: 20_000 });

    const box = await deleteBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(2);

    const triggerRatio = await measureButtonContrast(deleteBtn);
    expect(triggerRatio).toBeGreaterThanOrEqual(4.5);

    await deleteBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('pelanggan.ujian@example.com')).toBeVisible();

    // Fill password so confirm CTA renders in its enabled resting state for contrast check
    await dialog.locator('#delete-account-password').fill('SamplePass123!');
    const confirmBtn = dialog.getByRole('button', { name: 'Padam Akaun Kekal', exact: true });
    await expect(confirmBtn).toBeEnabled();
    const confirmRatio = await measureButtonContrast(confirmBtn);
    expect(confirmRatio).toBeGreaterThanOrEqual(4.5);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

test('delete account flow handles offline guard, wrong password error, and ordered permanent deletion', async ({
  page,
  context,
}) => {
  await setupCommonRoutes(page, { simulateCustomer: true });
  await seedAppStorage(page, { language: 'bm', theme: 'light' });

  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Padam Akaun', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 20_000 });

  const confirmBtn = dialog.getByRole('button', { name: 'Padam Akaun Kekal', exact: true });
  const passwordInput = dialog.locator('#delete-account-password');

  await context.setOffline(true);
  await expect(dialog.getByRole('status')).toContainText('luar talian');
  await expect(confirmBtn).toBeDisabled();

  await context.setOffline(false);
  await expect(dialog.getByRole('status')).toHaveCount(0);

  await passwordInput.fill('Salah123');
  await confirmBtn.click();
  await expect(dialog.getByRole('alert')).toContainText('Kata laluan tidak betul');

  let events = await page.evaluate(
    () => (window as unknown as { __e2eDeleteEvents?: string[] }).__e2eDeleteEvents || []
  );
  expect(events.some((e) => e.startsWith('deleteDoc:'))).toBe(false);
  expect(events.some((e) => e.startsWith('deleteUser:'))).toBe(false);

  await passwordInput.fill('KataLaluanBetul123!');
  await confirmBtn.click();

  await expect(page.getByText('Akaun Dipadamkan')).toBeVisible({ timeout: 10_000 });
  events = await page.evaluate(
    () => (window as unknown as { __e2eDeleteEvents?: string[] }).__e2eDeleteEvents || []
  );

  expect(events).toEqual([
    'reauthenticate:Salah123',
    'reauthenticate:KataLaluanBetul123!',
    'deleteDoc:calendar_notes/cust_e2e_1_2026-12-01',
    'deleteDoc:company_presets/preset_e2e_1',
    'deleteDoc:users/cust_e2e_1',
    'deleteUser:cust_e2e_1',
    'signOut',
  ]);
});

for (const [language, theme, width] of [
  ['bm', 'light', 390], ['en', 'dark', 390], ['bm', 'dark', 1280], ['en', 'light', 1280],
] as const) {
  test(`${language} ${theme} ${width}: signed-out sign-in and registration labels match the language`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupCommonRoutes(page);
    await seedAppStorage(page, { language, theme });
    await page.goto('/#/login');
    const bm = language === 'bm';
    await expect(page.getByRole('button', { name: bm ? 'Akses Pentadbir' : 'Admin Access' })).toBeVisible();
    const signIn = page.getByRole('button', { name: bm ? 'Log Masuk / Daftar' : 'Sign In / Register' });
    await signIn.click();
    const dialog = page.getByRole('dialog');
    const email = dialog.locator('#auth-email');
    await expect(email).toHaveAttribute('placeholder', bm ? 'cth. nama@organisasi.gov.my' : 'e.g. name@organisation.gov.my');
    await dialog.getByRole('button', { name: bm ? 'Lupa Kata Laluan?' : 'Forgot Password?' }).click();
    await expect(dialog.getByRole('heading', { name: bm ? 'Set Semula Kata Laluan' : 'Reset Password' })).toBeFocused();
    await dialog.getByRole('button', { name: bm ? 'Kembali ke log masuk' : 'Back to sign in' }).click();
    await expect(dialog.getByRole('heading', { name: bm ? 'Log Masuk' : 'Sign In' })).toBeFocused();
    await dialog.getByRole('button', { name: bm ? 'Daftar akaun' : 'Register account', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: bm ? 'Daftar Akaun Baru' : 'Register Account' })).toBeFocused();
    await expect(dialog.locator('#signup-name')).toHaveAttribute('placeholder', bm ? 'cth. Dato’ Ahmad' : 'e.g. Dato’ Ahmad');
    await expect(dialog.locator('#signup-contact')).toHaveAttribute('placeholder', bm ? 'cth. 012-345 6789' : 'e.g. 012-345 6789');
    await page.keyboard.press('Escape');
    await expect(signIn).toBeFocused();
  });

  test(`${language} ${theme} ${width}: member dashboard links to settings with localized switch names`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupCommonRoutes(page, { simulateCustomer: true });
    await seedAppStorage(page, { language, theme });
    await page.goto('/#/app');
    const bm = language === 'bm';
    await expect(page.getByText('Pelanggan Ujian', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(bm ? 'Sahkan e-mel sebelum menghantar tempahan.' : 'Verify your email before submitting an order.')).toBeVisible();
    await expect(page.getByText(bm ? 'Belum ada tempahan.' : 'No bookings yet.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: bm ? /Maklumat & tetapan/ : /Details & settings/ }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await page.locator('.settings-advanced summary').click();
    const haptics = page.getByRole('switch', { name: bm ? 'Getaran Maklum Balas (Haptic)' : 'Haptic Feedback' });
    const checked = await haptics.getAttribute('aria-checked');
    await haptics.focus();
    await page.keyboard.press('Space');
    await expect(haptics).toHaveAttribute('aria-checked', checked === 'true' ? 'false' : 'true');
  });
}

for (const [theme, width] of [['light', 390], ['dark', 1280]] as const) {
  test(`${theme}: simulated administrator can open each admin view`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupCommonRoutes(page, { adminVerified: true });
    await seedAppStorage(page, { language: 'en', theme, isAdmin: true });
    await page.goto('/#/admin');
    const tabs = page.locator('.app-admin-tabs');
    await expect(tabs).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Log Out', exact: true })).toBeVisible();
    for (const name of ['Tables View', 'Menu Manager', 'Orders']) {
      const button = tabs.getByRole('button', { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      if (name === 'Tables View') {
        await expect(page.getByRole('combobox', { name: 'Filter by status' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Rows per page' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
      }
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
  });
}

test('simulated admin invoice preview recovers after a failed PDF request', async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await setupCommonRoutes(page, { adminVerified: true });
  await seedAppStorage(page, { language: 'en', theme: 'light', isAdmin: true });
  const fixture = {
    id: 'audit-invoice', name: 'Invoice audit sample', status: 'approved', invoiceNo: 'AUDIT-1',
    date: '2026-11-23', guests: 20, quantity: 20, totalAmount: 200,
  };
  await page.route('**/api/admin/orders', route => route.fulfill({ json: { success: true, orders: [fixture] } }));
  const pdf = new jsPDF();
  pdf.text('Simulated invoice AUDIT-1', 20, 20);
  let unavailable = true;
  await page.route('**/api/invoice/audit-invoice/pdf?*', route => unavailable
    ? route.fulfill({ status: 503, json: { error: 'Simulated PDF service outage' } })
    : route.fulfill({ contentType: 'application/pdf', body: Buffer.from(pdf.output('arraybuffer')) }));
  await page.goto('/#/admin');
  await page.getByRole('button', { name: 'Tables View', exact: true }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Refresh Data', exact: true }).click();
  await page.getByText('Details and actions', { exact: true }).click();
  const preview = page.getByRole('button', { name: 'Preview PDF', exact: true });
  await preview.click();
  await expect(page.getByText(/Failed to generate PDF from server/)).toBeVisible();
  unavailable = false;
  await preview.click();
  await expect(page.getByText('Invoice_AUDIT-1.pdf', { exact: true })).toBeVisible();
});

test('verified customer completes a simulated catering submission', async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.clock.setFixedTime(new Date(2026, 10, 23, 12));
  await setupCommonRoutes(page, { simulateCustomer: true, verifiedCustomer: true, customerOrders: [
    { id: 'audit-booking-ref', userId: 'cust_e2e_1', status: 'pending', date: '2026-12-15' },
  ] });
  await seedAppStorage(page, { language: 'bm', theme: 'dark' });
  let attempts = 0;
  await page.route('**/api/orders', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { error: 'Simulated outage' } })
      : route.fulfill({ json: { success: true, id: 'audit-booking-ref' } });
  });
  await page.goto('/#/order');
  await page.locator('[data-tour="step1-event-type"] button').last().click();
  await page.locator('[data-tour="step1-meal-tengahari"]').click();
  await page.locator('[data-tour="step1-next"]').click();
  await page.locator('[data-tour="step2-next"]').click();
  await page.locator('#contact-name').fill('Contoh Ujian');
  await page.locator('#contact-phone').fill('0100000000');
  await page.locator('#contact-email').fill('pelanggan.ujian@example.com');
  await page.locator('#contact-confirm-email').fill('pelanggan.ujian@example.com');
  await page.locator('#event-date').fill('2026-12-15');
  await page.locator('#event-time').fill('09:00');
  await page.locator('#contact-location').fill('Lokasi simulasi');
  await page.getByRole('radio', { name: /Ambil di Restoran/ }).click();
  await page.locator('[data-tour="step3-next"]').click();
  const submit = page.locator('[data-tour="step4-submit"]');
  await submit.click();
  await expect(page.getByText('Tempahan tidak dapat dihantar', { exact: true })).toBeVisible();
  expect(attempts).toBe(1);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.locator('#booking-sent-heading')).toBeVisible();
  await expect(page.locator('#booking-summary').getByText('audit-booking-ref', { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  await page.getByRole('link', { name: 'Lihat tempahan ini' }).click();
  await expect(page).toHaveURL(/#\/profile\?booking=audit-booking-ref$/);
  await expect(page.getByRole('group', { name: 'Nombor rujukan audit-booking-ref' })).toBeFocused();
});

for (const [language, theme, width] of [['bm', 'dark', 320], ['en', 'light', 1280]] as const) {
  test(`${language}: latest booking shows the most recently submitted visible order and opens it`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupCommonRoutes(page, {
      simulateCustomer: true,
      recoverProfileHistory: true,
      customerOrders: [
        { id: 'older-audit-booking', userId: 'cust_e2e_1', createdAt: '2026-11-01', date: '2026-12-30', status: 'pending' },
        { id: 'latest-audit-booking', userId: 'cust_e2e_1', createdAt: '2026-11-21', date: '2026-12-15', status: 'approved' },
        { id: 'hidden-audit-booking', userId: 'cust_e2e_1', createdAt: '2026-11-23', deletedByUser: true },
        { id: 'other-account-booking', userId: 'other-fixture-user', createdAt: '2026-11-24' },
      ],
    });
    await seedAppStorage(page, { language, theme });
    await page.goto('/#/app');
    const bm = language === 'bm';
    const card = page.getByRole('region', { name: bm ? 'Tempahan terkini' : 'Latest booking' });
    await expect(card.getByRole('alert')).toBeVisible();
    await card.getByRole('button', { name: bm ? 'Cuba lagi' : 'Try again' }).click();
    await expect(card.getByText('latest-audit-booking', { exact: true })).toBeVisible();
    await expect(card.getByText('15/12/2026', { exact: true })).toBeVisible();
    await expect(card.getByText(bm ? 'Diluluskan' : 'Approved', { exact: true })).toBeVisible();
    await expect(card.getByRole('alert')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    await card.screenshot({ path: test.info().outputPath('latest-booking.png') });
    await card.getByRole('link', { name: bm ? 'Lihat tempahan' : 'View booking' }).click();
    await expect(page).toHaveURL(/#\/profile\?booking=latest-audit-booking$/);
    await expect(page.getByRole('group', { name: bm ? 'Nombor rujukan latest-audit-booking' : 'Booking reference latest-audit-booking' })).toBeFocused();
    await expect(page.locator('.profile-order-card')).toHaveCount(2);
  });
}

test('unknown booking link shows only the signed-in customer history', async ({ page }) => {
  await setupCommonRoutes(page, { simulateCustomer: true, customerOrders: [
    { id: 'other-account-booking', userId: 'other-fixture-user', createdAt: '2026-11-24' },
  ] });
  await seedAppStorage(page, { language: 'en' });
  await page.goto('/#/profile?booking=other-account-booking');
  await expect(page.getByText('This booking is unavailable. Your booking history is shown below.')).toBeVisible();
  await expect(page.getByText('No Past Orders Found', { exact: true })).toBeVisible();
  await expect(page.locator('.profile-order-card')).toHaveCount(0);
});

test('Android welcome waits for Get Started once and survives a cold launch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupCommonRoutes(page, { simulateCustomer: true });
  await seedAppStorage(page, { language: 'en', theme: 'dark' });
  await seedNativeLaunch(page);
  await page.clock.install();
  await page.goto('/#/');
  const getStarted = page.getByRole('button', { name: 'Get Started' });
  await expect(getStarted).toBeEnabled();
  await expect(page.locator('.native-welcome')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.native-welcome')).toHaveAttribute('data-sign-ready', 'true');
  await page.clock.fastForward(5500);
  await expect(getStarted).toBeInViewport();
  await expect(page.locator('.customer-dashboard-welcome')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), nativeWelcomeKey)).toBeNull();

  await getStarted.focus();
  await expect(getStarted).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/app$/);
  await expect(page.locator('.customer-dashboard-welcome')).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(`CapacitorStorage.${key}`), nativeWelcomeKey)).toBe('true');

  // Exercise the native preference read on cold launch without the local mirror.
  await page.evaluate(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem('wawasan_app_initialized');
  }, nativeWelcomeKey);
  const requestedArtwork: string[] = [];
  page.on('request', request => {
    if (/wawasan-native-(neon|wall)/.test(request.url())) requestedArtwork.push(request.url());
  });
  await page.reload();
  await expect(page).toHaveURL(/#\/app$/);
  await expect(page.locator('.customer-dashboard-welcome')).toBeVisible();
  await expect(getStarted).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), nativeWelcomeKey)).toBe('true');
  expect(requestedArtwork).toHaveLength(0);
});

test('returning Android visitor sees the short startup cover and reaches sign-in', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupCommonRoutes(page, { simulateCustomer: true, startSignedOut: true });
  await seedAppStorage(page, { language: 'en' });
  await seedNativeLaunch(page, { completed: true, pauseSplash: true });
  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status').getByText('Opening the app…')).toBeAttached();
  await expect(page.getByRole('button', { name: 'Get Started' })).toHaveCount(0);
  await page.waitForFunction(() => '__finishStartupSplash' in window);
  await page.evaluate(() => (window as unknown as { __finishStartupSplash: () => void }).__finishStartupSplash());
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('button', { name: 'Sign In / Register', exact: true })).toBeVisible();
});

test('returning Android administrator keeps the existing admin landing screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupCommonRoutes(page, { simulateCustomer: true, startSignedOut: true, adminVerified: true });
  await seedAppStorage(page, { language: 'en', isAdmin: true });
  await seedNativeLaunch(page, { completed: true });
  const [verification] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/verify'
      && response.request().method() === 'GET' && response.status() === 200),
    page.goto('/#/'),
  ]);
  expect(await verification.json()).toMatchObject({ verified: true, admin: true });
  await expect(page).toHaveURL(/#\/admin$/);
  await expect(page.locator('.app-admin-tabs')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Started' })).toHaveCount(0);
});

test('returning Android administrator cannot restore a rejected stored token', async ({ page }) => {
  await setupCommonRoutes(page, { simulateCustomer: true, startSignedOut: true, adminVerified: false });
  await seedAppStorage(page, { language: 'en', isAdmin: true });
  await seedNativeLaunch(page, { completed: true });
  const [verification] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/verify'
      && response.request().method() === 'GET' && response.status() === 401),
    page.goto('/#/'),
  ]);
  expect(await verification.json()).toMatchObject({ success: false, error: 'Unauthorized' });
  await expect(page.getByRole('heading', { name: 'Admin Access Restricted' })).toBeVisible();
  await expect(page.locator('.app-admin-tabs')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wawasan_admin_token'))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('CapacitorStorage.wawasan_admin_token'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Get Started' })).toHaveCount(0);
});

test('Android welcome recovers from a slow read and a failed native save', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupCommonRoutes(page, { simulateCustomer: true, startSignedOut: true });
  await seedAppStorage(page, { language: 'en' });
  await seedNativeLaunch(page, { stallWelcomeRead: true, failWelcomeWrite: true });
  await page.goto('/#/');
  const getStarted = page.getByRole('button', { name: 'Get Started' });
  await expect(getStarted).toBeEnabled();
  await expect(page.locator('.native-welcome')).toHaveAttribute('data-theme', 'light');
  await getStarted.click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(await page.evaluate(key => localStorage.getItem(key), nativeWelcomeKey)).toBe('true');
  expect(await page.evaluate(key => localStorage.getItem(`CapacitorStorage.${key}`), nativeWelcomeKey)).toBeNull();
  await page.evaluate(() => sessionStorage.removeItem('wawasan_app_initialized'));
  await page.reload();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('button', { name: 'Sign In / Register', exact: true })).toBeVisible();
  await expect(getStarted).toHaveCount(0);
});

test('public landing aliases and fallback reach the same home screen', async ({ page }) => {
  test.setTimeout(75_000);
  await setupCommonRoutes(page);
  await seedAppStorage(page);
  for (const route of ['/home', '/main', '/unregistered-audit-route']) {
    await page.goto(`/#${route}`);
    await expect(page.locator('.landing-hero')).toBeVisible();
  }
  await expect(page).toHaveURL(/#\/$/);
});

test('signed-in profile distinguishes history failure from an empty result', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await setupCommonRoutes(page, { simulateCustomer: true, recoverProfileHistory: true });
  await seedAppStorage(page, { language: 'en', theme: 'dark' });
  await page.goto('/#/profile');
  await expect(page.getByText('Could not load orders', { exact: true })).toBeVisible();
  await expect(page.getByText('No Past Orders Found', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('No Past Orders Found', { exact: true })).toBeVisible();
});

test('local sign-in fixture covers reset, invalid credentials and successful entry', async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await setupCommonRoutes(page, { simulateCustomer: true, startSignedOut: true });
  await seedAppStorage(page, { language: 'en', theme: 'dark' });
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Sign In / Register', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Forgot Password?' }).click();
  const email = dialog.locator('#auth-email');
  await email.fill('invalid');
  expect(await email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
  await email.fill('pelanggan.ujian@example.com');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText('Email Sent', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Sign In' })).toBeFocused();

  const password = dialog.locator('#auth-password');
  await password.fill('wrong-fixture-value');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText('Invalid email or password.', { exact: true })).toBeVisible();
  await password.fill('SyntheticPass123!');
  await dialog.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/app$/);
  await expect(page.getByText('Pelanggan Ujian', { exact: true })).toBeVisible();
});
