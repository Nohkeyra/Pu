import { test, expect } from '@playwright/test';

test('privacy dialog traps focus and Escape dismisses without recording acknowledgement', async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, items: [], orders: [], sessions: {} } });
    return route.continue();
  });
  await page.addInitScript(() => {
    localStorage.setItem('wawasan_language', 'en');
    localStorage.removeItem('wawasan_privacy_acknowledged');
    sessionStorage.setItem('wawasan_session_started', 'true');
  });
  await page.goto('/#/order');
  await expect(page.locator('[aria-label="Restoran Wawasan opening screen"]')).toBeHidden({ timeout: 15_000 });
  const trigger = page.locator('.customer-page-header .customer-theme-toggle');
  await trigger.focus();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:open-privacy-policy')));
  const dialog = page.getByRole('dialog', { name: 'Privacy Policy & Terms', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Tukar bahasa' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'I Understand & Continue' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Tukar bahasa' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('wawasan_privacy_acknowledged'))).toBeNull();
});
