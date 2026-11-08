import { test, expect, type Page } from '@playwright/test';

/**
 * Real-app visual acceptance gates. These tests need installed project deps and
 * the real local Vite/Express runtime. External services are replaced with
 * isolated deterministic responses; NO real order is created or transmitted.
 * Unlike source guards, these must be executed before sign-off.
 */
async function openGuestPage(page: Page, routePath: string, theme: 'light' | 'dark') {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, orders: [], sessions: {}, items: [], menuItems: [], settings: {} }),
      });
    }
    return route.continue();
  });
  await page.addInitScript((mode) => {
    localStorage.setItem('app_theme', mode);
    localStorage.setItem('CapacitorStorage.app_theme', mode);
    localStorage.setItem('wawasan_language', 'bm');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    localStorage.setItem('wawasan_order_tip_dismissed_v1', '1');
    sessionStorage.setItem('wawasan_session_started', 'true');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    sessionStorage.setItem('wawasan_privacy_completed', 'true');
  }, theme);
  await page.goto(`/#${routePath}`);
  const splash = page.locator('[aria-label="Restoran Wawasan opening screen"]');
  if (await splash.isVisible().catch(() => false)) {
    const skip = splash.getByRole('button', { name: /skip|langkau/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
  }
}

test.use({ reducedMotion: 'reduce' });

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 768, 1024]) {
    test(`${theme} ${width}px: landing layout and brand can be rendered`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await openGuestPage(page, '/', theme);
      await expect(page.locator('.landing-hero')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('#landing-brand-title')).toHaveText('Restoran Wawasan');
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
      await page.screenshot({ path: testInfo.outputPath(`landing-${theme}-${width}.png`), fullPage: true });
    });
  }

  test(`${theme} 390px: shared page dialog sits above header and dock`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openGuestPage(page, '/order', theme);
    const header = page.locator('.customer-page-header');
    await expect(header).toBeVisible({ timeout: 20_000 });
    await header.getByRole('button', { name: 'Tindakan halaman' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tindakan halaman' });
    await expect(dialog).toBeVisible();
    const values = await page.evaluate(() => ({
      header: Number(getComputedStyle(document.querySelector('.customer-page-header')!).zIndex),
      modal: Number(getComputedStyle(document.querySelector('[data-slot="dialog-content"]')!).zIndex),
      backdrop: Number(getComputedStyle(document.querySelector('[data-slot="dialog-overlay"]')!).zIndex),
    }));
    expect(values.modal).toBeGreaterThan(values.header);
    expect(values.backdrop).toBeGreaterThan(values.header);
    await page.screenshot({ path: testInfo.outputPath(`dialog-${theme}-390.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}
