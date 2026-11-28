import { test, expect, type Page } from '@playwright/test';
import { DEFAULT_MENU_ITEMS } from '../src/constants/menu';

// All data and responses are local fixtures. No real account or order is used.
async function setup(page: Page, options: { language?: 'en' | 'bm'; theme?: 'light' | 'dark'; native?: boolean; largeText?: boolean } = {}) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/api/menu') return route.fulfill({ json: { success: true, menuItems: DEFAULT_MENU_ITEMS, isDefault: false } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, orders: [], sessions: {}, settings: {} } });
    return route.continue();
  });
  await page.addInitScript(({ language = 'en', theme = 'light', native, largeText }) => {
    localStorage.setItem('wawasan_language', language);
    localStorage.setItem('app_theme', theme);
    localStorage.setItem('CapacitorStorage.app_theme', theme);
    if (largeText) {
      localStorage.setItem('app_custom_font_size_px', '22');
      localStorage.setItem('CapacitorStorage.app_custom_font_size_px', '22');
    }
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    sessionStorage.setItem('wawasan_session_started', 'true');
    if (native) document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add('wawasan-native');
      for (const [name, value] of Object.entries({ sat: '24px', sab: '24px', sal: '0px', sar: '0px' })) {
        document.documentElement.style.setProperty(`--${name}`, value);
        const edge = { sat: 'top', sab: 'bottom', sal: 'left', sar: 'right' }[name];
        document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, value);
      }
    });
  }, options);
}

async function open(page: Page, path = '/order') {
  await page.goto(`/#${path}`);
  await expect(page.locator('.customer-step-one, .heritage-hero, .customer-settings-tabs').first()).toBeVisible({ timeout: 20000 });
}

async function menuStep(page: Page) {
  await page.locator('[data-tour="step1-event-type"] button').last().click();
  await page.locator('[data-tour="step1-meal-tengahari"]').click();
  await page.locator('[data-tour="step1-next"]').click();
  await expect(page.locator('#dish-search')).toBeVisible();
}

test.use({ reducedMotion: 'reduce' });

test('a restored review returns to missing contact details and retains the event and dishes', async ({ page }) => {
  await setup(page);
  await open(page);
  await menuStep(page);
  const dish = page.locator('[data-tour="step2-dish-list"] button').first();
  const dishName = await dish.getAttribute('aria-label');
  await dish.click();
  await page.locator('[data-tour="step2-next"]').click();
  await page.locator('#contact-name').fill('Contoh Ujian');
  await page.locator('#contact-phone').fill('0100000000');
  await page.locator('#contact-email').fill('review@example.invalid');
  await page.locator('#contact-confirm-email').fill('review@example.invalid');
  await page.locator('#event-date').fill('2026-12-15');
  await page.locator('#contact-location').fill('Lokasi simulasi');
  await page.locator('[data-tour="step3-next"]').click();
  await expect(page.locator('[data-tour="step4-submit"]')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('wawasan_order_draft_state') || '{}'));
  expect(stored).not.toHaveProperty('email');
  expect(stored).not.toHaveProperty('contact');
  expect(stored).not.toHaveProperty('name');
  await page.reload();
  await expect(page.locator('#contact-name')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#contact-name')).toHaveValue('');
  await expect(page.locator('#event-date')).toHaveValue('2026-12-15');
  await expect(page.locator('.customer-progress-copy')).toContainText('3 / 4');
  await expect(page.locator('.customer-progress-extras')).toContainText('Event & menu saved');
  await page.locator('[data-tour="step3-next"]').click();
  await expect(page.locator('#contact-name')).toBeFocused();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: dishName!, exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('fallback is disclosed, retry preserves selections, and a successful empty menu stays empty', async ({ page }) => {
  await setup(page);
  let state: 'failed' | 'recovered' | 'empty' = 'failed';
  await page.route('**/api/menu', route => state === 'failed'
    ? route.fulfill({ status: 503, json: { error: 'Simulated failure' } })
    : route.fulfill({ json: { success: true, menuItems: state === 'empty' ? [] : DEFAULT_MENU_ITEMS.slice(0, 1), isDefault: false } }));
  await open(page);
  await menuStep(page);
  await expect(page.getByText('Showing the built-in menu.', { exact: false })).toBeVisible();
  const dish = page.locator('[data-tour="step2-dish-list"] button').first();
  const name = await dish.getAttribute('aria-label');
  await dish.click();
  state = 'recovered';
  await page.getByRole('button', { name: 'Retry menu', exact: true }).click();
  await expect(page.getByText('Showing the built-in menu.', { exact: false })).toHaveCount(0);
  await expect(page.getByText('These saved choices are not in the current menu.', { exact: false })).toContainText(name!);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wawasan_order_draft_state') || '{}').dishes)).toHaveLength(1);
  state = 'empty';
  await page.reload();
  await expect(page.locator('#dish-search')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-tour="step2-dish-list"] button')).toHaveCount(0);
  await expect(page.getByText('No items available in this category.', { exact: true })).toBeVisible();
  await expect(page.getByText('Showing the built-in menu.', { exact: false })).toHaveCount(0);
});

test('server-provided default catalogue is also disclosed', async ({ page }) => {
  await setup(page);
  await page.route('**/api/menu', route => route.fulfill({ json: { success: true, menuItems: DEFAULT_MENU_ITEMS, isDefault: true } }));
  await open(page);
  await menuStep(page);
  await expect(page.getByRole('button', { name: 'Retry menu', exact: true })).toBeVisible();
});

test('radio cards support arrow keys and invalid Next focuses its associated choice', async ({ page }) => {
  await setup(page);
  await open(page);
  await page.locator('[data-tour="step1-next"]').click();
  const radios = page.locator('[data-tour="step1-event-type"] [role="radio"]');
  await expect(radios.first()).toBeFocused();
  await expect(page.locator('[data-tour="step1-event-type"]')).toHaveAttribute('aria-describedby', 'event-type-error');
  await page.keyboard.press('ArrowRight');
  await expect(radios.last()).toBeFocused();
  await expect(radios.last()).toHaveAttribute('aria-checked', 'true');
  await expect(radios.first()).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('Home');
  await expect(radios.first()).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-tour="step1-next"]').click();
  await expect(page.locator('[data-tour="step1-meal-sarapan"]')).toBeFocused();
});

test('Malay language, settings switch and general catering actions have accurate names', async ({ page }) => {
  await setup(page, { language: 'bm' });
  await open(page, '/settings');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms-MY');
  await expect(page.getByRole('switch', { name: 'Analitik Penggunaan', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigasi utama', exact: true })).toBeVisible();
  await open(page, '/');
  await expect(page.locator('.landing-menu-footer button').first()).toHaveAccessibleName('Mulakan draf katering');
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: incoming compact menu cards and order note retain selections and fallback feedback`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await setup(page, { theme, native: true });
    await page.route('**/api/menu', route => route.fulfill({ json: { success: true, menuItems: DEFAULT_MENU_ITEMS, isDefault: true } }));
    await open(page);
    await menuStep(page);
    await expect(page.locator('.customer-menu-heading h2')).toHaveText('Choose your dishes');
    await expect(page.getByRole('button', { name: 'Retry menu', exact: true })).toBeVisible();
    const summary = page.locator('.customer-order-summary');
    await expect(summary).not.toHaveAttribute('open', '');
    // Read both rectangles in the same browser frame; asynchronous layout/scroll
    // changes between separate boundingBox calls can compare different frames.
    // A persistent overlap still fails: no pixel tolerance or test retries.
    await expect.poll(async () => page.evaluate(() => {
      const aside = document.querySelector('.customer-order-aside');
      const form = document.querySelector('.customer-form-panel');
      if (!aside || !form) return Number.NEGATIVE_INFINITY;
      return aside.getBoundingClientRect().top - form.getBoundingClientRect().bottom;
    }), { message: 'Order summary must be below the form', timeout: 5000 }).toBeGreaterThanOrEqual(0);
    const card = page.locator('[data-tour="step2-dish-list"] .customer-menu-card').first();
    const name = await card.getAttribute('aria-label');
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(summary.locator('.customer-order-summary-count')).toContainText('1 selection');
    await summary.locator('summary').click();
    await expect(summary.locator('.customer-order-note-list')).toContainText(name!);
    await expect(page.locator('.customer-menu-selected-count').first()).toContainText('1 Selected');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: info.outputPath('merged-menu-note.png') });
    await page.locator('[data-tour="step2-next"]').click();
    await page.locator('.customer-order-summary-heading').click();
    const contrast = await page.locator('.customer-order-summary li > span').first().evaluate(element => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const chain: Element[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1);
      for (const node of chain.reverse()) { ctx.fillStyle = getComputedStyle(node).backgroundColor; ctx.fillRect(0, 0, 1, 1); }
      const background = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      ctx.fillStyle = getComputedStyle(element).color; ctx.fillRect(0, 0, 1, 1);
      const foreground = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      const luminance = (rgb: number[]) => rgb.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
      const a = luminance(background), b = luminance(foreground);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bm', 'en'] as const) {
    for (const device of [
      { width: 320, height: 844, native: false },
      { width: 320, height: 844, native: true },
      { width: 390, height: 844, native: true },
      { width: 844, height: 390, native: true },
    ]) {
      test(`${theme} ${language} ${device.width} ${device.native ? 'APK styling' : 'web'}: form, dock and identity stay balanced`, async ({ page }, info) => {
        await page.setViewportSize(device);
        await setup(page, { theme, language, native: device.native });
        await open(page);
        await page.evaluate(() => document.fonts.ready);
        const geometry = await page.evaluate(() => {
          const choice = document.querySelector('[data-tour="step1-event-type"] button')!.getBoundingClientRect();
          const nav = document.querySelector('#bottom-navigation')!.getBoundingClientRect();
          return { overflow: document.documentElement.scrollWidth - innerWidth, firstChoice: choice.top, dockTop: nav.top,
            labels: [...document.querySelectorAll('.nav-label')].map(el => ({ height: el.getBoundingClientRect().height, line: Number.parseFloat(getComputedStyle(el).lineHeight), width: el.getBoundingClientRect().width, scroll: el.scrollWidth })),
            touch: [...document.querySelectorAll('#bottom-navigation button')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
            font: getComputedStyle(document.querySelector('.customer-brand-name')!).fontFamily };
        });
        expect(geometry.overflow).toBeLessThanOrEqual(2);
        if (device.height > 500) expect(geometry.firstChoice).toBeLessThan(geometry.dockTop);
        for (const label of geometry.labels) {
          expect(label.height).toBeLessThanOrEqual(label.line + 1);
          expect(label.scroll).toBeLessThanOrEqual(label.width + 1);
        }
        for (const control of geometry.touch) { expect(control.width).toBeGreaterThanOrEqual(48); expect(control.height).toBeGreaterThanOrEqual(48); }
        expect(geometry.font).toContain('Uncial Antiqua');
        await page.screenshot({ path: info.outputPath('order-first-viewport.png') });
      });
    }
  }
  test(`${theme}: enlarged APK text and keyboard keep fields clear`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await setup(page, { theme, native: true, largeText: true });
    await open(page);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('22px');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    const labelsFit = await page.locator('#bottom-navigation').evaluate(nav => {
      const labels = [...nav.querySelectorAll<HTMLElement>('.nav-label')];
      return nav.scrollWidth <= nav.clientWidth + 1 && labels.every((label, index) => {
        const rect = label.getBoundingClientRect();
        const next = labels[index + 1]?.getBoundingClientRect();
        return label.scrollWidth <= rect.width + 1 && (!next || rect.right <= next.left);
      });
    });
    expect(labelsFit).toBe(true);
    await page.locator('#guests-input').focus();
    await page.setViewportSize({ width: 320, height: 430 });
    await expect(page.locator('#bottom-navigation')).toHaveCount(0);
    await page.locator('#guests-input').fill('120');
    await expect.poll(async () => {
      const field = (await page.locator('#guests-input').boundingBox())!;
      const progress = (await page.locator('.customer-order-progress').boundingBox())!;
      return field.y >= progress.y + progress.height && field.y + field.height <= 430;
    }).toBe(true);
  });
  test(`${theme}: APK landscape respects side cutouts and the bottom inset`, async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await setup(page, { theme, native: true });
    await open(page);
    await page.evaluate(() => {
      for (const [name, value] of Object.entries({ sal: '44px', sar: '32px', sab: '24px' })) document.documentElement.style.setProperty(`--${name}`, value);
    });
    const nav = (await page.locator('#bottom-navigation').boundingBox())!;
    expect(nav.x).toBeGreaterThanOrEqual(44);
    expect(nav.x + nav.width).toBeLessThanOrEqual(844 - 32);
    expect(nav.y + nav.height).toBeLessThanOrEqual(390 - 24);
  });
}
