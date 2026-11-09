import { test, expect } from '@playwright/test';

test('has title or loads homepage', async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/');
  await expect(page).toHaveTitle(/Restoran Wawasan|Wawasan/i);
});
