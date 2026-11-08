import { test, expect, type Page } from '@playwright/test';

async function open(page: Page, path: string, theme: 'light' | 'dark', native = true) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, orders: [], sessions: {}, items: [], menuItems: [], settings: {} } });
    return route.continue();
  });
  await page.addInitScript(({ theme, native }) => {
    localStorage.setItem('app_theme', theme);
    localStorage.setItem('CapacitorStorage.app_theme', theme);
    localStorage.setItem('wawasan_language', 'bm');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    sessionStorage.setItem('wawasan_session_started', 'true');
    if (native) document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add('wawasan-native');
      document.documentElement.style.setProperty('--sat', '24px');
      document.documentElement.style.setProperty('--sab', '24px');
    });
  }, { theme, native });
  await page.goto(`/#${path}`);
  await expect(page.locator('[aria-label="Restoran Wawasan opening screen"]')).toBeHidden({ timeout: 15000 });
}

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: help, summary, advanced controls and customer calendar keep their scope`, async ({ page }, info) => {
    await open(page, '/order', theme);
    const help = page.locator('.customer-order-help');
    await expect(help).not.toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: 'Tonton demo' })).toBeHidden();
    await help.locator('summary').click();
    await expect(page.getByRole('button', { name: 'Tonton demo' })).toBeVisible();
    await expect(page.getByRole('note')).toBeVisible();
    await help.locator('summary').click();
    const summary = page.locator('.customer-order-summary');
    await expect(summary).not.toHaveAttribute('open', '');
    await summary.locator('summary').click();
    await expect(summary.locator('.customer-quote-box')).toBeVisible();
    await summary.locator('summary').click();
    await page.locator('[data-tour="step1-event-type"] button').last().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('[data-tour="step1-next"]').click();
    await expect(summary).not.toHaveAttribute('open', '');
    await page.goto('/#/settings');
    await expect(page.locator('.settings-app-info-name')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Semak Kemaskini', exact: true })).toBeVisible();
    const advanced = page.locator('.settings-advanced');
    await expect(advanced).toBeVisible();
    await expect(advanced).not.toHaveAttribute('open', '');
    await expect(page.getByRole('switch', { name: 'Toggle immersive mode' })).toBeHidden();
    await advanced.locator('summary').click();
    await expect(page.getByRole('switch', { name: 'Toggle immersive mode' })).toBeVisible();
    await page.keyboard.press('Tab');
    await page.screenshot({ path: info.outputPath(`advanced-${theme}.png`) });
    await page.goto('/#/calendar');
    await expect(page.locator('.customer-calendar-day').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.customer-calendar-internal-notes')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tempah untuk tarikh ini' })).toBeVisible();
  });
}

test('web keeps the full order summary expanded initially', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, '/order', 'dark', false);
  await expect(page.locator('.customer-order-summary')).toHaveAttribute('open', '');
  await expect(page.locator('.customer-quote-box')).toBeVisible();
});

test('Bold Heritage separates neutral text, brand accents and readable feature ink', async ({ page }) => {
  await open(page, '/order', 'dark');
  await expect(page.locator('.lc-paper-scene')).toBeVisible({ timeout: 20000 });
  const values = await page.evaluate(() => {
    function rgba(value: string): number[] {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
    }
    function ratio(a: number[], b: number[]) {
      const lum = (v: number[]) => v.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
      const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
    }
    const page = document.querySelector('.customer-page')!;
    const scene = document.querySelector('.lc-paper-scene')!;
    const title = document.querySelector('.lc-paper-copy h2')!;
    const next = document.querySelector('[data-tour="step1-next"]')!;
    const p = getComputedStyle(page), s = getComputedStyle(scene), t = getComputedStyle(title), n = getComputedStyle(next);
    return { body: ratio(rgba(p.color), rgba(p.backgroundColor)), feature: ratio(rgba(t.color), rgba(s.backgroundColor)), action: ratio(rgba(n.color), rgba(n.backgroundColor)), bodyColor: rgba(p.color), actionColor: rgba(n.backgroundColor), featureColor: rgba(s.backgroundColor) };
  });
  expect(values.body).toBeGreaterThanOrEqual(4.5);
  expect(values.feature).toBeGreaterThanOrEqual(4.5);
  expect(values.action).toBeGreaterThanOrEqual(4.5);
  expect(values.bodyColor).not.toEqual(values.actionColor);
  expect(values.featureColor).not.toEqual(values.actionColor);
});
