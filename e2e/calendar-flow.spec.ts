import { test, expect, type Page } from '@playwright/test';

async function openCalendar(page: Page, theme: 'light' | 'dark', scenario: { unavailable: boolean; eventDate?: string } = { unavailable: false }) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['/api/calendar-data', '/api/calendar-sessions', '/api/calendar-orders'].includes(url.pathname)) {
      return route.fulfill({
        status: scenario.unavailable ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify(scenario.unavailable
          ? { error: 'Simulated service unavailable' }
          : { success: true, sessions: {}, orders: scenario.eventDate ? [{ id: 'fixture-calendar-event', eventDate: scenario.eventDate, status: 'approved', guests: 20 }] : [] }),
      });
    }
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/')) {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, orders: [], menuItems: [], settings: {} }),
      });
    }
    return route.continue();
  });
  await page.addInitScript(value => {
    localStorage.setItem('app_theme', value);
    localStorage.setItem('CapacitorStorage.app_theme', value);
    localStorage.setItem('wawasan_language', 'bm');
    localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
    localStorage.setItem('wawasan_order_tip_dismissed_v1', '1');
    localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    sessionStorage.setItem('wawasan_session_started', 'true');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    sessionStorage.setItem('wawasan_privacy_completed', 'true');
  }, theme);
  await page.goto('/#/calendar');
  await expect(page.locator('.customer-calendar-month-title')).toBeVisible({ timeout: 20_000 });
}

test.use({ viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce' });

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: a failed calendar request is distinct from an empty day and retry recovers`, async ({ page }) => {
    const scenario = { unavailable: true };
    await openCalendar(page, theme, scenario);
    const error = page.getByRole('alert').filter({ hasText: 'Data jadual belum lengkap' });
    await expect(error).toBeVisible();
    await expect(page.getByText('Tiada tempahan untuk tarikh ini.', { exact: true })).toHaveCount(0);
    scenario.unavailable = false;
    await error.getByRole('button', { name: 'Cuba lagi', exact: true }).click();
    await expect(error).toHaveCount(0);
    await expect(page.getByText('Tiada tempahan untuk tarikh ini.', { exact: true })).toBeVisible();
  });

  test(`${theme}: Home and Back labels match their destinations`, async ({ page }) => {
    await openCalendar(page, theme);
    const home = () => page.locator('.customer-page-header').getByRole('button', { name: 'Restoran Wawasan — halaman utama', exact: true });
    await expect(home()).toBeVisible();
    await page.locator('#bottom-navigation').getByRole('button', { name: 'Profil', exact: true }).click();
    const back = page.locator('.customer-page-header').getByRole('button', { name: 'Kembali', exact: true });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/#\/calendar$/);
    await home().click();
    await expect(page).toHaveURL(/#\/$/);
  });

  test(`${theme}: booking from a selected day carries that date into the order form`, async ({ page }) => {
    await openCalendar(page, theme);
    const day = page.locator('.customer-calendar-day[aria-label*=", 5 "]');
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    const expectedDate = await page.evaluate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
    });
    await page.getByRole('button', { name: 'Tempah untuk tarikh ini', exact: true }).click();
    await page.locator('[data-tour="step1-event-type"] button').first().click();
    await page.locator('[data-tour="step1-meal-tengahari"]').click();
    await page.locator('.customer-next-button').click();
    await expect(page.locator('.customer-progress-copy')).toContainText('2 / 4');
    await page.locator('.customer-next-button').click();
    await expect(page.locator('#event-date')).toHaveValue(expectedDate);
    // Stop at the date field; no order is submitted and no real account is used.
  });
}

for (const [theme, width] of [['light', 390], ['dark', 1280]] as const) {
  test(`${theme}: calendar event details trap and restore focus with a 44px close button`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date(2026, 10, 23, 12));
    await openCalendar(page, theme, { unavailable: false, eventDate: '2026-11-23T12:00:00' });

    const trigger = page.getByRole('button', { name: 'Lihat Butiran', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: '20 Pax • Acara' });
    const close = dialog.getByRole('button', { name: 'Tutup', exact: true }).first();
    await expect(close).toBeFocused();
    const bounds = await close.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Lihat di Profil' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    const actions = page.getByRole('button', { name: 'Buka tindakan pantas' });
    await actions.click();
    await page.getByRole('button', { name: 'Lihat Butiran Acara' }).click();
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(actions).toBeFocused();
  });
}
