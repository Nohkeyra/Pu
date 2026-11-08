import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
for (const theme of ['light', 'dark']) {
  test(`${theme}: centered branding and visible Back work across viewport sizes`, async ({ page }, info) => {
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, orders: [], sessions: {}, items: [], menuItems: [], settings: {} } });
      return route.continue();
    });
    await page.addInitScript(theme => {
      localStorage.setItem('app_theme', theme);
      localStorage.setItem('CapacitorStorage.app_theme', theme);
      localStorage.setItem('wawasan_language', 'bm');
      sessionStorage.setItem('wawasan_guest_allowed', 'true');
      sessionStorage.setItem('wawasan_session_started', 'true');
    }, theme);
    await page.goto('/#/calendar');
    await expect(page.locator('[aria-label="Restoran Wawasan opening screen"]')).toBeHidden({ timeout: 15000 });
    const back = page.getByRole('button', { name: 'Kembali ke halaman utama', exact: true });
    await expect(back).toBeVisible();
    for (const native of [false, true]) {
      await page.evaluate(native => {
        document.documentElement.classList.toggle('wawasan-native', native);
        document.documentElement.style.setProperty('--sat', native ? '24px' : '0px');
      }, native);
      for (const width of [320, 360, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        const metrics = await page.locator('.customer-brand').evaluate(el => {
          const brand = el.getBoundingClientRect();
          const start = document.querySelector('.customer-header-start')!.getBoundingClientRect();
          const end = document.querySelector('.customer-brand-actions')!.getBoundingClientRect();
          return { center: brand.x + brand.width / 2, viewport: innerWidth / 2,
            startEnd: start.right, brandStart: brand.left, brandEnd: brand.right, endStart: end.left,
            clipped: el.scrollWidth > el.clientWidth,
            font: getComputedStyle(document.querySelector('.customer-brand-name')!).fontFamily };
        });
        expect(Math.abs(metrics.center - metrics.viewport)).toBeLessThan(1);
        expect(metrics.startEnd).toBeLessThanOrEqual(metrics.brandStart);
        expect(metrics.brandEnd).toBeLessThanOrEqual(metrics.endStart);
        expect(metrics.clipped).toBe(false);
        expect(metrics.font).toContain('Uncial Antiqua');
        await expect(back).toBeVisible();
        if (width === 390) await page.screenshot({ path: info.outputPath(`${theme}-${native ? 'apk' : 'web'}.png`) });
      }
    }
    await back.click();
    await expect(page).toHaveURL(/\/#\/?$/);
    await page.goto('/#/calendar');
    await page.locator('.customer-page-header').waitFor();
    await page.locator('#bottom-navigation button').last().click();
    await expect(page).toHaveURL(/#\/settings$/);
    await page.getByRole('button', { name: 'Kembali', exact: true }).click();
    await expect(page).toHaveURL(/#\/calendar$/);
  });
}
