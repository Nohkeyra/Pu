import { test, expect } from '@playwright/test';

test('slow device feedback never blocks order selection, quantity or step navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname.endsWith('/@capacitor_haptics.js')) return route.fulfill({ contentType: 'application/javascript', body: `
      export const ImpactStyle = { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' };
      export const NotificationType = { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' };
      export const Haptics = { impact: () => new Promise(() => {}), notification: async () => {}, vibrate: async () => {} };` });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, menuItems: [], orders: [], sessions: {} } });
    return route.continue();
  });
  await page.addInitScript(() => {
    localStorage.setItem('wawasan_language', 'en');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    sessionStorage.setItem('wawasan_session_started', 'true');
  });
  await page.goto('/#/order');
  await expect(page.locator('.customer-step-one')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-tour="step1-event-type"] button').last().click();
  const meal = page.locator('[data-tour="step1-meal-tengahari"]');
  await meal.click();
  await expect(meal).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('51');
  await page.locator('[data-tour="step1-next"]').click();
  const dish = page.locator('[data-tour="step2-dish-list"] button').first();
  await expect(dish).toBeVisible();
  await dish.click();
  await expect(dish).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-tour="step2-next"]').click();
  await expect(page.locator('#contact-name')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[data-tour="step2-dish-list"] button').first()).toBeVisible();
});
