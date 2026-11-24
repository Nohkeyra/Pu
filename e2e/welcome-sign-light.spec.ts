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
  // The readiness gate must warm the very resources CSS will render, rather
  // than a different URL with the same pathname but a different cache key.
  const maskResources = await page.locator('.native-welcome__sign-stage').evaluate(stage => {
    const warmed = [...stage.querySelectorAll<HTMLImageElement>('.native-welcome__mask-source')].map(img => img.currentSrc);
    const rendered = [...stage.querySelectorAll('.native-welcome__sign, .native-welcome__neon-tubes')].map(el => {
      const mask = getComputedStyle(el).maskImage;
      return mask.slice(5, -2);
    });
    return { warmed: warmed.sort(), rendered: rendered.sort() };
  });
  expect(maskResources.rendered).toEqual(maskResources.warmed);
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
  await expect(power).toHaveCSS('animation-duration', '1.4s');
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
  const lights = page.locator(':is(.native-welcome__neon-power, .native-welcome__neon-spill)');
  const startTimes = await lights.evaluateAll(async (elements) => {
    const animations = elements.map((element) => element.getAnimations()[0]);
    await Promise.all(animations.map((animation) => animation.ready));
    return animations.map((animation) => animation.startTime);
  });
  expect(startTimes).toHaveLength(2);
  expect(startTimes[0]).toBe(startTimes[1]);
  const shadow = await page.locator('.native-welcome__board').evaluate(el => getComputedStyle(el).filter);
  expect(shadow).toContain('drop-shadow');
  const seek = (time: number) => lights.evaluateAll(async (elements, ms) => {
    for (const element of elements) {
      const animation = element.getAnimations()[0];
      animation.pause();
      animation.currentTime = ms;
    }
    await new Promise(requestAnimationFrame);
    return elements.map((element) => Number(getComputedStyle(element).opacity));
  }, time);
  // Sample both sides of every ignition edge. A smooth opacity ramp or a
  // residual glow during the thermal gaps must fail this regression.
  const samples = [
    [0, 0], [209, 0], [211, .48], [245, .48], [279, .48],
    [281, 0], [559, 0], [561, .82], [610, .82], [657, .82],
    [659, 0], [979, 0], [981, 1], [1400, 1], [4000, 1],
  ];
  for (const [time, expected] of samples) {
    expect(await seek(time)).toEqual([expected, expected]);
    expect(await page.locator('.native-welcome__board').evaluate(el => getComputedStyle(el).filter)).toBe(shadow);
    expect(await page.locator('.native-welcome__wall').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  }
  // Pixel check outside the board: the real rendered reflection brightens with
  // its emitter. The wall texture is the same fixture in both captures.
  const sign = (await page.locator('.native-welcome__sign-stage').boundingBox())!;
  // The physical top rim sits at about 9% of the square plate. Sample the
  // nearby wall just above that arc, not beyond the image's empty right margin.
  const clip = { x: Math.ceil(sign.x + sign.width * .42), y: Math.ceil(sign.y + sign.height * .035), width: Math.floor(sign.width * .16), height: Math.floor(sign.height * .035) };
  const belowSign = {
    left: Math.ceil(sign.x + sign.width * .38),
    top: Math.ceil(sign.y + sign.height * .88),
    width: Math.floor(sign.width * .24),
    height: Math.floor(sign.height * .03),
  };
  await seek(0);
  const off = await page.screenshot({ clip });
  const offFrame = await page.screenshot({ path: test.info().outputPath('sign-starter-off.png') });
  await seek(245);
  const firstStrike = await page.screenshot({ clip });
  await seek(610);
  const secondStrike = await page.screenshot({ clip });
  await seek(981);
  const on = await page.screenshot({ clip });
  const onFrame = await page.screenshot({ path: test.info().outputPath('sign-starter-on.png') });
  const sharp = (await import('sharp')).default;
  const brightness = async (buffer: Buffer) => {
    const { data } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  };
  const [offLight, firstLight, secondLight, steadyLight] =
    await Promise.all([off, firstStrike, secondStrike, on].map(brightness));
  expect(firstLight).toBeGreaterThan(offLight + .5);
  expect(secondLight).toBeGreaterThan(firstLight + .5);
  expect(steadyLight).toBeGreaterThan(secondLight + .5);
  const [unlitWall, illuminatedWall] = await Promise.all(
    [offFrame, onFrame].map(async (frame) =>
      sharp(frame).extract(belowSign).removeAlpha().raw().toBuffer()
    )
  );
  // The reflection should add light to the wall, including where the board
  // casts its shadow. Allow a small difference for compositor rounding.
  expect(illuminatedWall.every((value, i) => value >= unlitWall[i] - 2)).toBe(true);
  const gain = illuminatedWall.reduce((sum, value, i) => sum + value - unlitWall[i], 0);
  expect(gain / illuminatedWall.length).toBeGreaterThan(20);
});

test('daylight has no powered tubes, spill, flicker or hidden delayed relight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openWelcome(page);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  await expect(page.locator('.native-welcome__neon-power')).toBeHidden();
  await expect(page.locator('.native-welcome__neon-spill')).toBeHidden();
  await expect(page.locator('.native-welcome__sign')).toHaveAttribute('src', /neon-unlit\.webp(?:\?|$)/);
  expect(await page.locator('.native-welcome').evaluate(el => el.getAnimations({ subtree: true }).some(a => a instanceof CSSAnimation && a.animationName === 'native-wawasan-neon-start'))).toBe(false);
  await expect(page.locator('.native-welcome__wall-image--night')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: test.info().outputPath('sign-day-off.png') });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('.native-welcome__neon-power')).toHaveCSS('animation-name', 'native-wawasan-neon-start');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('.native-welcome__neon-power')).toBeHidden();
  await expect(page.locator('.native-welcome__neon-spill')).toBeHidden();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page.locator('[data-completed]')).toHaveAttribute('data-completed', '1');
});

test('Reduced Motion gives steady night light and still keeps daylight off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWelcome(page);
  await page.evaluate(() => (window as unknown as { __welcomeReady: () => void }).__welcomeReady());
  await expect(page.locator('.native-welcome__neon-power')).toHaveCSS('opacity', '1');
  await expect(page.locator('.native-welcome__neon-spill')).toHaveCSS('opacity', '1');
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
