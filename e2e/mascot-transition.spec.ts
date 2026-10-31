import { test, expect, type Page } from '@playwright/test';

async function openMenuStep(page: Page, rejectPlayback = false) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"orders":[]}' });
    return route.continue();
  });
  await page.addInitScript((reject) => {
    localStorage.setItem('wawasan_order_draft_step', '2');
    localStorage.setItem('wawasan_order_draft_state', JSON.stringify({ eventType: 'lain', mealTypes: ['sarapan'], guests: 10, dishes: [], veggies: [], customMenu: '' }));
    localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', 'true');
    sessionStorage.setItem('wawasan_privacy_completed', 'true');
    if (reject) HTMLMediaElement.prototype.play = () => Promise.reject(new Error('Simulated video failure'));
  }, rejectPlayback);
  await page.goto('/#/order');
  const splash = page.locator('[aria-label="Restoran Wawasan opening screen"]');
  if (await splash.isVisible().catch(() => false)) await splash.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByLabel('Find a dish or drink')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => ((document.querySelector('video[src*="daun_penarik"]') as HTMLVideoElement | null)?.readyState ?? 0) >= 2);
}

async function expectStepThree(page: Page) {
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wawasan_order_draft_step'))).toBe('3');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('wawasan_order_draft_state') || '{}'));
  expect(draft.customMenu).toBe('Set Box Makanan dan Minuman');
}

test.use({ viewport: { width: 375, height: 812 } });

test('maskot and page move together and selection step completes', async ({ page }) => {
  await openMenuStep(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const video = page.locator('video[src*="daun_penarik"]');
  await expect(video).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.waitForFunction(() => {
    const v = document.querySelector('video[src*="daun_penarik"]');
    return v && new DOMMatrix(getComputedStyle(v).transform).m41 > 10;
  });
  const position = await page.evaluate(() => {
    const video = document.querySelector('video[src*="daun_penarik"]')!;
    const sheet = document.querySelector('[aria-busy="true"] > div')!;
    const x = (element: Element) => new DOMMatrix(getComputedStyle(element).transform).m41;
    return { video: x(video), sheet: x(sheet) };
  });
  expect(Math.abs(position.video - position.sheet)).toBeLessThan(8);
  await expectStepThree(page);
  await expect(video).toBeHidden();
});

test('reduced motion proceeds without waiting for animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMenuStep(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expectStepThree(page);
  await expect(page.locator('video[src*="daun_penarik"]')).toBeHidden();
});

test('playback failure never blocks the form', async ({ page }) => {
  await openMenuStep(page, true);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expectStepThree(page);
});
