import { test, expect, type Page } from '@playwright/test';

async function openOrder(page: Page, theme: string, native = true) {
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
  await page.goto('/#/order');
  await expect(page.locator('[aria-label="Restoran Wawasan opening screen"]')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.customer-step-one')).toBeVisible({ timeout: 20_000 });
}

async function scrollPastScene(page: Page) {
  await page.locator('.customer-order-preview-anchor').evaluate(el => {
    window.scrollBy({ top: el.getBoundingClientRect().bottom + 20, behavior: 'instant' });
  });
  await expect(page.locator('.customer-order-progress')).toHaveAttribute('data-preview-docked', 'true');
}

test.use({ reducedMotion: 'reduce' });
test('mini artwork responds to the system motion preference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOrder(page, 'light');
  await scrollPastScene(page);
  const art = page.locator('.lc-preview-mini-art > svg');
  expect(await art.evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await art.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

for (const theme of ['light', 'dark']) {
  test(`${theme}: keyboard compacts the preview and keeps the focused field clear`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await openOrder(page, theme);
    await page.evaluate(() => { document.documentElement.style.fontSize = '22px'; });
    await scrollPastScene(page);
    await page.getByRole('button', { name: 'Tindakan kemajuan tempahan', exact: true }).click();
    const field = page.locator('#guests-input');
    await field.focus();
    await page.setViewportSize({ width: 320, height: 430 });
    const progress = page.locator('.customer-order-progress');
    await expect(progress).toHaveAttribute('data-keyboard-visible', 'true');
    await expect(page.locator('.lc-preview-mini-art')).toBeHidden();
    await expect(page.locator('.customer-progress-extras')).toBeHidden();
    await expect(page.locator('#bottom-navigation')).toBeHidden();
    await field.fill('120');
    await expect(progress).toContainText('120 pax');
    await expect.poll(async () => {
      const fieldRect = (await field.boundingBox())!;
      const navRect = (await progress.boundingBox())!;
      return fieldRect.y >= navRect.y + navRect.height && fieldRect.y + fieldRect.height <= 430;
    }).toBe(true);
    await page.screenshot({ path: info.outputPath('keyboard-large-text.png') });
    await field.blur();
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(progress).toHaveAttribute('data-keyboard-visible', 'false');
  });

  for (const width of [320, 390, 1280]) {
    test(`${theme} ${width}: persistent preview follows pax/style, expands and restores focus`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 844 });
      await openOrder(page, theme, width < 1000);
      await expect(page.locator('.customer-order-progress')).toHaveAttribute('data-preview-docked', 'false');
      await page.locator('#guests-input').fill('75');
      await page.locator('#guests-input').blur();
      await scrollPastScene(page);
      const trigger = page.getByRole('button', { name: 'Buka pratonton tempahan', exact: true });
      await expect(trigger).toContainText('75 pax');
      await page.screenshot({ path: info.outputPath('mini-preview.png') });
      const geometry = await page.evaluate(() => {
        const nav = document.querySelector('.customer-order-progress')!.getBoundingClientRect();
        const header = document.querySelector('.customer-page-header')!.getBoundingClientRect();
        return { navTop: nav.top, navHeight: nav.height, headerBottom: header.bottom };
      });
      expect(geometry.navTop).toBeGreaterThanOrEqual(geometry.headerBottom);
      expect(geometry.navTop - geometry.headerBottom).toBeLessThanOrEqual(8);
      expect(geometry.navHeight).toBeLessThanOrEqual(95);
      if (width >= 1024) {
        const aside = (await page.locator('.customer-order-aside').boundingBox())!;
        expect(aside.y).toBeGreaterThanOrEqual(geometry.navTop + geometry.navHeight);
      }
      await trigger.click();
      const sheet = page.getByRole('dialog', { name: 'Pratonton tempahan', exact: true });
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText('75 pax');
      const sheetBox = (await sheet.boundingBox())!;
      expect(sheetBox.y).toBeGreaterThanOrEqual(0);
      expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(845);
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await page.getByRole('button', { name: 'Tindakan kemajuan tempahan', exact: true }).click();
      await expect(page.locator('.customer-order-help')).toBeVisible();
      await page.getByRole('button', { name: 'Tindakan kemajuan tempahan', exact: true }).click();
      await page.getByRole('radio', { name: /Bufet/ }).click();
      await scrollPastScene(page);
      await expect(trigger).toContainText('Buffet');
      await expect(trigger.locator('svg[data-serving-style]')).toHaveAttribute('data-serving-style', 'buffet');
      await trigger.click();
      await expect(sheet.locator('.lc-paper-art svg')).toHaveAttribute('data-serving-style', 'buffet');
      await expect(sheet.getByRole('button', { name: 'Tutup pratonton', exact: true })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('buffet-sheet.png') });
      await page.keyboard.press('Escape');
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    });
  }

  test(`${theme}: menu selections and open/closed preview share state with the sheet`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOrder(page, theme);
    await page.locator('[data-tour="step1-event-type"] button').last().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('[data-tour="step1-next"]').click();
    await page.locator('[data-tour="step2-dish-list"] button').first().click();
    await scrollPastScene(page);
    const trigger = page.getByRole('button', { name: 'Buka pratonton tempahan', exact: true });
    await expect(trigger).toContainText('1 pilihan');
    await trigger.click();
    const sheet = page.getByRole('dialog', { name: 'Pratonton tempahan', exact: true });
    await expect(sheet.locator('.lc-preview-selected li')).toHaveCount(1);
    await sheet.getByRole('button', { name: 'Tutup pratonton', exact: true }).click();
    await expect(sheet.locator('.lc-paper-scene')).toHaveAttribute('data-mode', 'packed');
    await page.keyboard.press('Escape');
    expect(await trigger.locator('.closed-top').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await trigger.click();
    await sheet.getByRole('button', { name: 'Buka pratonton', exact: true }).click();
    await expect(sheet.locator('.lc-paper-scene')).toHaveAttribute('data-mode', 'menu');
    await page.keyboard.press('Escape');
    expect(await trigger.locator('.closed-top').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
  });
}
