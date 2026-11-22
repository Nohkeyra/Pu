import { test, expect, type Page } from '@playwright/test';

// The actual welcome screen and artwork, with local theme/language/loading
// controls. No authenticated app session or physical Android performance claim.
const fixture = `
<meta name="viewport" content="width=device-width, initial-scale=1" />
<div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import RefreshRuntime from '/@react-refresh';
import '/src/index.css';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
const { default: NativeWelcomeScreen } = await import('/src/components/brand/NativeWelcomeScreen.tsx');
function Fixture() {
  const [theme, setTheme] = React.useState('dark');
  const [loading, setLoading] = React.useState(true);
  const [language, setLanguage] = React.useState('en');
  const [complete, setComplete] = React.useState(0);
  window.__welcomeTheme = { theme, setThemeFromWelcome: setTheme };
  window.__welcomeLanguage = { language };
  window.__welcomeReady = () => setLoading(false);
  window.__welcomeMalay = () => setLanguage('bm');
  return React.createElement('div', { 'data-completed': complete },
    React.createElement(NativeWelcomeScreen, { isLoading: loading, onComplete: () => setComplete(n => n + 1) }));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Fixture)));
</script>`;

async function openWelcome(page: Page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/__welcome-light') return route.fulfill({ contentType: 'text/html', body: fixture });
    if (url.pathname === '/src/context/ThemeContext.tsx') return route.fulfill({ contentType: 'application/javascript', body: 'export const useTheme = () => window.__welcomeTheme;' });
    if (url.pathname === '/src/context/LanguageContext.tsx') return route.fulfill({ contentType: 'application/javascript', body: 'export const useLanguage = () => window.__welcomeLanguage;' });
    return route.continue();
  });
  await page.goto('/__welcome-light');
  await expect(page.locator('.native-welcome')).toHaveAttribute('data-sign-ready', 'true');
}

test.use({ viewport: { width: 393, height: 851 }, video: { mode: 'on', size: { width: 393, height: 851 } } });

test('night starter runs once, stays lit, and a locale rerender never restarts it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openWelcome(page);
  const screen = page.locator('.native-welcome');
  const power = page.locator('.native-welcome__neon-power');
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeDisabled();
  await expect(power).toHaveCSS('opacity', '0');
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeEnabled();
  await expect(power).toHaveCSS('animation-duration', '2.8s');
  await expect(power).toHaveCSS('animation-iteration-count', '1');
  await expect.poll(() => power.evaluate(el => el.getAnimations().filter(a => a.playState === 'running').length), { timeout: 4500 }).toBe(0);
  await expect(power).toHaveCSS('opacity', '1');
  await page.screenshot({ path: test.info().outputPath('sign-night-steady.png') });
  await page.evaluate(() => (window as unknown as { __welcomeMalay: () => void }).__welcomeMalay());
  await expect(page.getByRole('heading', { name: 'Selamat Datang!' })).toBeVisible();
  await expect(power).toHaveCSS('opacity', '1');
  expect(await screen.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  expect(errors).toEqual([]);
});

test('the tube and actual wall reflection share each starter pulse while the contact shadow stays fixed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openWelcome(page);
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  const power = page.locator('.native-welcome__neon-power');
  await expect(power).toHaveCSS('animation-name', 'native-wawasan-neon-start');
  expect(await power.locator('.native-welcome__neon-tubes').count()).toBe(1);
  expect(await power.locator('.native-welcome__neon-spill').count()).toBe(1);
  const shadow = await page.locator('.native-welcome__board').evaluate(el => getComputedStyle(el).filter);
  expect(shadow).toContain('drop-shadow');
  const seek = async (time: number) => {
    await power.evaluate((el, ms) => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = ms; }, time);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    return Number(await power.evaluate(el => getComputedStyle(el).opacity));
  };
  for (const [time, expected] of [[0, 0], [420, .64], [800, .03], [1200, .85], [1600, .06], [2050, 1], [2350, .2], [2800, 1]]) {
    expect(await seek(time)).toBeCloseTo(expected, 2);
    expect(await page.locator('.native-welcome__board').evaluate(el => getComputedStyle(el).filter)).toBe(shadow);
    expect(await page.locator('.native-welcome__wall').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  }
  // Pixel check outside the board: the real rendered reflection brightens with
  // its emitter. The wall texture is the same fixture in both captures.
  const sign = (await page.locator('.native-welcome__sign-stage').boundingBox())!;
  const clip = { x: Math.ceil(sign.x + sign.width + 1), y: Math.ceil(sign.y + sign.height * .45), width: 10, height: Math.floor(sign.height * .35) };
  await seek(0);
  const off = await page.screenshot({ clip });
  await page.screenshot({ path: test.info().outputPath('sign-starter-off.png') });
  await seek(2050);
  const on = await page.screenshot({ clip });
  await page.screenshot({ path: test.info().outputPath('sign-starter-on.png') });
  const sharp = (await import('sharp')).default;
  const brightness = async (buffer: Buffer) => {
    const { data } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  };
  expect(await brightness(on)).toBeGreaterThan((await brightness(off)) + .5);
});

test('daylight has no powered tubes, spill, flicker or hidden delayed relight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openWelcome(page);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  await expect(page.locator('.native-welcome__neon-power')).toBeHidden();
  await expect(page.locator('.native-welcome__sign')).toHaveAttribute('src', /neon-unlit.webp$/);
  expect(await page.locator('.native-welcome').evaluate(el => el.getAnimations({ subtree: true }).some(a => a instanceof CSSAnimation && a.animationName === 'native-wawasan-neon-start'))).toBe(false);
  await page.screenshot({ path: test.info().outputPath('sign-day-off.png') });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('.native-welcome__neon-power')).toHaveCSS('animation-name', 'native-wawasan-neon-start');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('.native-welcome__neon-power')).toBeHidden();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('[data-completed]')).toHaveAttribute('data-completed', '1');
});

test('Reduced Motion gives steady night light and still keeps daylight off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWelcome(page);
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  await expect(page.locator('.native-welcome__neon-power')).toHaveCSS('opacity', '1');
  expect(await page.locator('.native-welcome').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('.native-welcome__neon-power')).toBeHidden();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('[data-completed]')).toHaveAttribute('data-completed', '1');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 851, height: 393 }]) {
  test(`${viewport.width}x${viewport.height} retains the whole sign and reachable controls`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await openWelcome(page);
    await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
    const sign = await page.locator('.native-welcome__sign').boundingBox();
    const tubes = await page.locator('.native-welcome__neon-tubes').boundingBox();
    expect(tubes).toEqual(sign);
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeInViewport();
    const geometry = await page.locator('.native-welcome__scroll').evaluate(el => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
    await page.screenshot({ path: test.info().outputPath('sign-layout.png') });
  });
}
