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

test('one clockwise accumulating circuit, coherent wall spill, then steady light', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openWelcome(page);
  const screen = page.locator('.native-welcome');
  const core = page.locator('.native-welcome__rim-core');
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeDisabled();
  await expect(core).toHaveCSS('opacity', '0');
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeEnabled();
  await expect(core).toHaveCSS('animation-duration', '6s');
  await expect(core).toHaveCSS('animation-iteration-count', '1');
  const offsets = async () => page.locator('.native-welcome__light-path').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).strokeDashoffset)));
  const shadow = await page.locator('.native-welcome__sign').evaluate(el => getComputedStyle(el).filter);
  await page.screenshot({ path: test.info().outputPath('sign-start.png') });
  for (const [limit, label] of [[.75, 'quarter'], [.5, 'half'], [.25, 'three-quarter']] as const) {
    await expect.poll(async () => (await offsets())[0], { timeout: 3000 }).toBeLessThan(limit);
    const values = await offsets();
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(.005);
    await page.screenshot({ path: test.info().outputPath('sign-' + label + '.png') });
  }
  await expect(core).toHaveCSS('stroke-dashoffset', '0px', { timeout: 3000 });
  await page.screenshot({ path: test.info().outputPath('sign-steady.png') });
  expect(await page.locator('.native-welcome__sign').evaluate(el => getComputedStyle(el).filter)).toBe(shadow);
  expect(await screen.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  // A normal rerender never starts another circuit.
  await page.evaluate(() => (window as unknown as { __welcomeMalay: () => void }).__welcomeMalay());
  await expect(page.getByRole('heading', { name: 'Selamat Datang!' })).toBeVisible();
  await expect(core).toHaveCSS('stroke-dashoffset', '0px');
  const geometry = await screen.evaluate(el => ({ width: el.scrollWidth, height: el.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight }));
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight);
  // A new dark-mode activation is a new power-on; leaving is never gated on it.
  await page.getByRole('button', { name: 'Tukar ke mod cerah' }).click();
  await expect(page.locator('.native-welcome__rim-light')).toBeHidden();
  await page.screenshot({ path: test.info().outputPath('sign-day.png') });
  await page.getByRole('button', { name: 'Tukar ke mod gelap' }).click();
  expect((await offsets())[0]).toBeGreaterThan(.8);
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('[data-completed]')).toHaveAttribute('data-completed', '1');
  expect(errors).toEqual([]);
});

test('Reduced Motion has steady light immediately and permits immediate exit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWelcome(page);
  await expect(page.locator('.native-welcome__rim-core')).toHaveCSS('stroke-dashoffset', '0px');
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  expect(await page.locator('.native-welcome').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('[data-completed]')).toHaveAttribute('data-completed', '1');
});

test('a landscape viewport retains the same complete contour', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 851, height: 393 });
  await openWelcome(page);
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  const sign = await page.locator('.native-welcome__sign').boundingBox();
  const light = await page.locator('.native-welcome__rim-light').boundingBox();
  expect(light).toEqual(sign);
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath('sign-landscape.png') });
});
