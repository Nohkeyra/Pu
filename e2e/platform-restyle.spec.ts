import { test, expect, type Page } from '@playwright/test';

// Isolated API responses: no real account, order, location or outbound action.
async function openScreen(page: Page, path: string, theme: string, native: boolean) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, orders: [], sessions: {}, items: [], menuItems: [], settings: {} } });
    return route.continue();
  });
  await page.addInitScript(({ theme, native }) => {
    localStorage.setItem('app_theme', theme);
    localStorage.setItem('CapacitorStorage.app_theme', theme);
    if (!localStorage.getItem('wawasan_language')) localStorage.setItem('wawasan_language', 'bm');
    if (!sessionStorage.getItem('wawasan_visual_test_bootstrapped')) {
      localStorage.setItem('wawasan_order_tip_dismissed_v1', '1');
      sessionStorage.setItem('wawasan_visual_test_bootstrapped', 'true');
    }
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    sessionStorage.setItem('wawasan_session_started', 'true');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    document.addEventListener('DOMContentLoaded', () => {
      if (native) {
        // Exercise the production presentation marker, not the native bridge.
        document.documentElement.classList.add('wawasan-native');
        document.documentElement.style.setProperty('--sat', '24px');
        document.documentElement.style.setProperty('--sab', '24px');
      }
    });
  }, { theme, native });
  await page.goto(`/#${path}`);
  await expect(page.locator('[aria-label="Restoran Wawasan opening screen"]')).toBeHidden({ timeout: 15_000 });
}

test.use({ reducedMotion: 'reduce' });
const screens = [
  ['/', '.heritage-hero'], ['/login', '.login-card'], ['/order', '.customer-step-one'],
  ['/profile', '.customer-profile-access'], ['/calendar', '.customer-calendar-day'],
  ['/settings', '.customer-settings-tabs'], ['/admin', '.wawasan-login-shell'],
] as const;
for (const theme of ['light', 'dark']) {
  for (const device of [
    { name: 'desktop', width: 1280, height: 900, native: false },
    { name: 'mobile-web', width: 390, height: 844, native: false },
    { name: 'compact-apk', width: 320, height: 640, native: true },
    { name: 'phone-apk', width: 390, height: 844, native: true },
    { name: 'landscape-apk', width: 844, height: 390, native: true },
  ]) {
    test(`${theme} ${device.name}: pages remain reachable without horizontal overflow`, async ({ page }, info) => {
      await page.setViewportSize(device);
      await openScreen(page, '/order', theme, device.native);
      for (const [path, selector] of screens) {
        await page.goto(`/#${path}`);
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 20_000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
        if (device.native && !['/', '/login', '/admin'].includes(path)) {
          await expect(page.locator('.customer-brand-footer')).toBeHidden();
        }
        await page.screenshot({ path: info.outputPath(`${path.slice(1) || 'landing'}.png`), fullPage: true });
      }
    });
  }
  test(`${theme}: one progression action per order step and accessible header dialog`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openScreen(page, '/order', theme, true);
    await expect(page.locator('[data-tour="step1-next"]')).toBeVisible();
    await page.locator('[data-tour="step1-event-type"] button').last().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('[data-tour="step1-next"]').click();
    await expect(page.locator('[data-tour="step2-next"]')).toBeVisible();
    await expect(page.locator('.customer-progress-copy')).toContainText('2 / 4');
    await page.locator('[data-tour="step2-next"]').click();
    await expect(page.locator('#event-date')).toBeVisible();
    await page.locator('.customer-page-header').getByRole('button', { name: 'Tindakan halaman' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tindakan halaman' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.locator('#contact-name').fill('Contoh Ujian');
    await page.locator('#contact-phone').fill('0100000000');
    await page.locator('#contact-email').fill('visual@example.invalid');
    await page.locator('#contact-confirm-email').fill('visual@example.invalid');
    await page.locator('#event-date').fill('2026-12-15');
    await page.locator('#event-time').fill('09:00');
    await page.locator('#contact-location').fill('Lokasi simulasi');
    await page.getByRole('radio', { name: /Ambil di Restoran/ }).click();
    await page.locator('[data-tour="step3-next"]').click();
    await expect(page.locator('[data-tour="step4-submit"]')).toBeVisible();
    await expect(page.locator('.customer-order-summary')).toHaveAttribute('open', '');
    await expect(page.locator('.customer-next-button')).toHaveCount(1);
    const colors = await page.locator('[data-tour="step4-submit"]').evaluate(element => {
      const style = getComputedStyle(element);
      return { ink: style.color, fill: style.backgroundColor };
    });
    expect(colors.ink).not.toBe(colors.fill);
    // Stop at review. No request is submitted.
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: enlarged English text and a shortened viewport keep fields reachable`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openScreen(page, '/order', theme, true);
    await page.evaluate(() => {
      localStorage.setItem('wawasan_language', 'en');
      localStorage.setItem('app_custom_font_size_px', '22');
      localStorage.setItem('CapacitorStorage.app_custom_font_size_px', '22');
    });
    await page.reload();
    await expect(page.locator('[data-tour="step1-next"]')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-tour="step1-event-type"] button').first().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('[data-tour="step1-next"]').click();
    await page.locator('[data-tour="step2-next"]').click();
    await page.setViewportSize({ width: 320, height: 390 });
    const date = page.locator('#event-date');
    await date.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(date).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    const geometry = await page.evaluate(() => {
      const field = document.querySelector('#event-date')!.getBoundingClientRect();
      const header = document.querySelector('.customer-page-header')!.getBoundingClientRect();
      const dock = document.querySelector('#bottom-navigation')!.getBoundingClientRect();
      return { fieldTop: field.top, fieldBottom: field.bottom, headerBottom: header.bottom, dockTop: dock.top };
    });
    expect(geometry.fieldTop).toBeGreaterThanOrEqual(geometry.headerBottom);
    expect(geometry.fieldBottom).toBeLessThanOrEqual(geometry.dockTop);
    await page.screenshot({ path: info.outputPath('enlarged-text-short-viewport.png') });
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: APK order intro stays compact in BM and EN without clipping large text`, async ({ page }, info) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await openScreen(page, '/order', theme, true);
      for (const language of ['bm', 'en']) {
        await page.evaluate(value => {
          localStorage.setItem('wawasan_language', value);
          localStorage.removeItem('wawasan_order_tip_dismissed_v1');
        }, language);
        await page.reload();
        const scene = page.locator('.lc-paper-scene');
        await expect(scene).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.customer-step-one')).toBeVisible();
        await expect.poll(async () => (await scene.boundingBox())!.height).toBeLessThanOrEqual(110);
        await expect(page.locator('.lc-paper-scene[data-stage="home"] .lc-paper-copy p')).toBeHidden();
        await expect(page.locator('[data-tour="step1-next"]')).toBeVisible();
        await expect(page.getByRole('note')).toBeHidden();
        await page.locator('.customer-order-help > summary').click();
        await expect(page.getByRole('note')).toBeVisible();
        await expect(page.getByRole('button', { name: /Watch demo|Tonton demo/ })).toBeVisible();
        await page.locator('.customer-order-help > summary').click();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
        await page.screenshot({ path: info.outputPath(`compact-${width}-${language}.png`) });
      }
    }
    await page.evaluate(() => {
      localStorage.setItem('app_custom_font_size_px', '22');
      localStorage.setItem('CapacitorStorage.app_custom_font_size_px', '22');
    });
    await page.reload();
    await expect(page.locator('.lc-paper-copy h2')).toBeVisible({ timeout: 20_000 });
    const geometry = await page.evaluate(() => {
      const title = document.querySelector('.lc-paper-copy h2')!.getBoundingClientRect();
      const scene = document.querySelector('.lc-paper-scene')!.getBoundingClientRect();
      const count = document.querySelector('.lc-paper-footer')!.getBoundingClientRect();
      return { titleTop: title.top, titleBottom: title.bottom, countBottom: count.bottom, sceneTop: scene.top, sceneBottom: scene.bottom };
    });
    expect(geometry.titleTop).toBeGreaterThanOrEqual(geometry.sceneTop);
    expect(geometry.titleBottom).toBeLessThanOrEqual(geometry.sceneBottom);
    expect(geometry.countBottom).toBeLessThanOrEqual(geometry.sceneBottom);
    await page.locator('[data-tour="step1-event-type"] button').last().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('[data-tour="step1-next"]').click();
    await expect(page.locator('.lc-paper-scene[data-stage="menu"] .lc-paper-copy p')).toBeVisible();
  });
}
