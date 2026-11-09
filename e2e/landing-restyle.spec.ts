import { test, expect, type Page } from '@playwright/test';

async function openLanding(page: Page, theme: 'light' | 'dark') {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orders: [],
          items: [],
          sessions: {},
          notifications: [],
          enabled: false,
        }),
      });
    return route.continue();
  });
  await page.addInitScript((value) => {
    if (window.top !== window) return;
    localStorage.setItem('app_theme', value);
    localStorage.setItem('CapacitorStorage.app_theme', value);
    localStorage.setItem('wawasan_language', 'bm');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    sessionStorage.setItem('wawasan_session_started', 'true');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    sessionStorage.setItem('wawasan_privacy_completed', 'true');
  }, theme);
  await page.goto('/#/');
  await expect(page.locator('.landing-hero')).toBeVisible({ timeout: 20_000 });
}

test.use({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: menu search, categories and no-results recovery work together`, async ({
    page,
  }) => {
    await openLanding(page, theme);
    await page.locator('.heritage-hero-actions').getByRole('link', { name: 'Lihat Menu' }).click();
    const categories = page.getByRole('group', { name: 'Kategori menu' });
    await categories.getByRole('button', { name: 'Minuman', exact: true }).click();
    await expect(categories.getByRole('button', { name: 'Minuman', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('.landing-menu-card')).toHaveCount(2);
    const search = page.getByRole('searchbox', { name: 'Cari sajian' });
    await search.fill('teh tarik');
    await expect(page.locator('.landing-menu-card')).toHaveCount(1);
    await expect(page.locator('.landing-menu-card h3')).toHaveText('Teh Tarik Kaw');
    await search.fill('no-matching-dish-123');
    await expect(page.getByRole('heading', { name: 'Sajian tidak ditemui' })).toBeVisible();
    await page.getByRole('button', { name: 'Lihat semua sajian', exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(
      categories.getByRole('button', { name: 'Semua sajian', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.landing-menu-card')).toHaveCount(8);
  });

  test(`${theme}: tablet menu is visible, traps Tab, closes with Escape and reaches sections`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 1000 });
    await openLanding(page, theme);
    const open = page.getByRole('button', { name: 'Buka menu', exact: true });
    await open.click();
    const menu = page.getByRole('dialog', { name: 'Menu utama' });
    await expect(menu).toBeVisible();
    const close = menu.getByRole('button', { name: 'Tutup menu' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(menu.getByRole('link').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.click();
    await menu.getByRole('link', { name: 'Menu', exact: true }).click();
    await expect(menu).toHaveCount(0);
    await expect(page.locator('#menu')).toBeInViewport();
    await expect(page).toHaveURL(/#\/$/);
  });

  test(`${theme}: primary order action works as a guest and keeps brand typography`, async ({
    page,
  }) => {
    await openLanding(page, theme);
    const brand = page.locator('#landing-brand-title');
    await expect(brand).toHaveText('Restoran Wawasan');
    expect(await brand.evaluate((element) => getComputedStyle(element).fontFamily)).toContain(
      'Uncial Antiqua'
    );
    expect(
      await page
        .locator('.landing-hero')
        .evaluate(
          (element) =>
            [...element.getAnimations({ subtree: true })].filter(
              (animation) => animation.playState === 'running'
            ).length
        )
    ).toBe(0);
    await page
      .locator('.heritage-hero-actions')
      .getByRole('link', { name: 'Tempah Katering' })
      .click();
    await expect(page).toHaveURL(/#\/order$/);
    await expect(page.locator('.customer-page')).toBeVisible();
  });
}
