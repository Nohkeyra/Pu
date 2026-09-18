import { test, expect } from '@playwright/test';

test('has title or loads homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Restoran Wawasan|Wawasan/i);
});
