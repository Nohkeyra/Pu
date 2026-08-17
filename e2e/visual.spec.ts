import { test, expect } from '@playwright/test';

test.describe('Restoran Wawasan Visual Regression Suite', () => {
  test('Capture Home Page layout and typography pairing', async ({ page }) => {
    // Navigate to the main application landing/ordering route
    await page.goto('/');

    // Wait for the main root layout or primary displays to load
    await page.waitForSelector('#root', { state: 'visible', timeout: 15000 });

    // Allow static asset rendering and subtle entry transitions to stabilize
    await page.waitForTimeout(1200);

    // Capture visual snapshots and match against viewports
    await expect(page).toHaveScreenshot('home-page-layout.png', {
      maxDiffPixelRatio: 0.03, // 3% margin for localized font smoothing differences
      animations: 'disabled',  // disable layout animations for reliable testing
      fullPage: true,
    });
  });

  test('Verify customer booking flow elements and modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 15000 });

    // Look for localized order buttons to launch catering configurations
    const actionButton = page.locator('button:has-text("Book Now"), button:has-text("Tempah Sekarang"), button:has-text("Pesan")').first();
    
    if (await actionButton.isVisible()) {
      await actionButton.click();
      // Allow modal scaling to complete
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot('catering-wizard-modal.png', {
        maxDiffPixelRatio: 0.03,
        animations: 'disabled',
      });
    }
  });
});
