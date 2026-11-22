import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

async function setupCommonRoutes(
  page: Page,
  options: {
    simulateCustomer?: boolean;
    adminVerified?: boolean;
  } = {}
) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();

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
              providerData: [{ providerId: 'password' }],
              getIdToken: async () => 'e2e-mock-token',
            };
            export const isNative = false;
            export const isWorkspace = true;
            export const app = {};
            export const db = {};
            export const analytics = null;
            export const auth = {
              currentUser: mockUser,
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
            export class GoogleAuthProvider {}
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
            export async function signInWithEmailAndPassword() { return {}; }
            export async function createUserWithEmailAndPassword() { return {}; }
            export async function sendPasswordResetEmail() {}
            export async function sendEmailVerification() {}
            export async function signInWithCustomToken() { return {}; }
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
            export function onSnapshot() { return () => {}; }
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
