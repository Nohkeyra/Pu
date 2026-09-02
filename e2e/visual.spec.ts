import { test, expect } from '@playwright/test';

test.describe('Restoran Wawasan Visual Regression Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations and continuous motion for deterministic visual baselines
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('Capture Home Page layout and typography pairing', async ({ page }) => {
    // Navigate to the main application landing/ordering route
    await page.goto('/');

    // Wait for the main root layout or primary displays to load
    await page.waitForSelector('#root', { state: 'visible', timeout: 15000 });

    // Ensure document fonts have completed loading
    await page.evaluate(() => document.fonts.ready);

    // Allow static asset rendering and subtle entry transitions to stabilize
    await page.waitForTimeout(1000);

    // Capture visual snapshots with masked dynamic/parallax background layers
    await expect(page).toHaveScreenshot('home-page-layout.png', {
      maxDiffPixelRatio: 0.05, // Margin for cross-engine font anti-aliasing (WebKit vs Chromium)
      threshold: 0.2,
      animations: 'disabled',
      mask: [
        page.locator('.batik-container'),
        page.locator('.pointer-events-none'),
      ],
    });
  });

  test('Verify customer booking flow elements and modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);

    // Look for localized order buttons to launch catering configurations
    const actionButton = page.locator('button:has-text("Book Now"), button:has-text("Tempah Sekarang"), button:has-text("Pesan")').first();
    
    if (await actionButton.isVisible()) {
      await actionButton.click();
      // Allow modal scaling to complete
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot('catering-wizard-modal.png', {
        maxDiffPixelRatio: 0.05,
        threshold: 0.2,
        animations: 'disabled',
      });
    }
  });
});
