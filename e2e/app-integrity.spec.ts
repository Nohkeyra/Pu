import { test, expect } from '@playwright/test';

// Actual UI/hooks with local settings, native bridge and update operations.
// No real notification, update installation, account or production record is used.
const fixture = `
<meta name="viewport" content="width=device-width, initial-scale=1" />
<div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import RefreshRuntime from '/@react-refresh';
import '/src/index.css';
import '/src/styles/wawasan-four-colour-theme.css';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
window.__native = new URLSearchParams(location.search).get('screen') !== 'diagnostics' && new URLSearchParams(location.search).get('screen') !== 'update-web';
window.__downloads = [];
window.__launches = [];
window.__launchOK = true;
window.__toasts = 0;
window.__minimized = 0;
window.__settings = { customBatikColor: 'orange', setCustomBatikColor: () => {}, batikDensity: 4, setBatikDensity: () => {} };
document.addEventListener('click', e => {
  const link = e.target.closest?.('a[target="_blank"]');
  if (link) { e.preventDefault(); window.__downloads.push(link.href); }
}, true);
const [{ MemoryRouter, useLocation }, { DiagnosticConsole }, { default: InAppUpdateModal }, { useNativeBackButton }, { useDeepLinks }] = await Promise.all([
  import('/node_modules/.vite/deps/react-router-dom.js'),
  import('/src/components/system/DiagnosticConsole.tsx'),
  import('/src/components/system/InAppUpdateModal.tsx'),
  import('/src/hooks/native/useNativeBackButton.ts'),
  import('/src/hooks/native/useDeepLinks.ts'),
]);
function BackFixture() {
  useNativeBackButton(new URLSearchParams(location.search).get('screen') === 'welcome-back');
  const location = useLocation();
  const [parent, setParent] = React.useState(true), [child, setChild] = React.useState(true);
  React.useEffect(() => { document.getElementById('child-close')?.focus(); }, []);
  return React.createElement(React.Fragment, null,
    React.createElement('output', { id: 'route' }, location.pathname),
    parent && React.createElement('section', { role: 'dialog', 'aria-label': 'Parent dialog' },
      React.createElement('button', { 'aria-label': 'Close parent', onClick: () => setParent(false) }, 'Close parent')),
    child && React.createElement('section', { role: 'alertdialog', 'aria-label': 'Child dialog' },
      React.createElement('button', { id: 'child-close', 'aria-label': 'Close child', onClick: () => setChild(false) }, 'Close child')));
}
function LinkFixture() {
  useDeepLinks();
  return React.createElement('output', { id: 'route' }, useLocation().pathname);
}
function Fixture() {
  const screen = new URLSearchParams(location.search).get('screen');
  const [open, setOpen] = React.useState(false);
  window.__close = () => setOpen(false);
  const close = React.useCallback(() => setOpen(false), []);
  const config = { latestVersion: '9.0.0', minVersion: '1.0.0', buildNumber: 900,
    apkUrl: 'https://local.invalid/Wawasan.apk', releaseNotes: [], forceUpdate: false,
    bundleUrl: screen === 'update-ota' ? 'https://local.invalid/bundle.zip' : '' };
  if (screen === 'links') return React.createElement(MemoryRouter, { initialEntries: ['/home'] }, React.createElement(LinkFixture));
  if (screen === 'back' || screen === 'welcome-back') return React.createElement(MemoryRouter, { initialEntries: ['/home', '/order'] }, React.createElement(BackFixture));
  return React.createElement(React.Fragment, null,
    React.createElement('button', { onClick: () => setOpen(true) }, 'Open fixture'),
    screen === 'diagnostics' ? React.createElement(DiagnosticConsole, { isOpen: open, onClose: close })
      : React.createElement(InAppUpdateModal, { isOpen: open, config, isForceUpdate: false, onDismiss: close }));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Fixture)));
</script>`;

test.use({ viewport: { width: 393, height: 851 }, reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.error('Integrity fixture:', error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/__app-integrity') return route.fulfill({ contentType: 'text/html', body: fixture });
    const scripts: Record<string, string> = {
      '/src/context/SettingsContext.tsx': 'export const useSettings = () => window.__settings;',
      '/src/context/LanguageContext.tsx': 'export const useLanguage = () => ({ language: "en" });',
      '/src/lib/haptics.ts': 'export const playClickSound = () => {}, triggerLightImpact = async () => {}, triggerMediumImpact = async () => {}, triggerHeavyImpact = async () => {}, triggerNotification = async () => {}; export const NotificationType = { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" };',
      '/src/services/updateService.ts': 'export const CURRENT_APP_VERSION = "1.0.0", DEFAULT_APK_URL = "https://local.invalid/Wawasan.apk"; export const downloadAndApplyCapgoOta = () => new Promise(r => { window.__finishOTA = r; });',
      '/src/hooks/native/useMobileKeyboard.ts': 'export const useMobileKeyboard = () => ({ isKeyboardVisible: false });',
      '/src/components/ui/Toast.tsx': 'export const useToast = () => ({ toast: () => window.__toasts++ });',
    };
    if (scripts[url.pathname]) return route.fulfill({ contentType: 'application/javascript', body: scripts[url.pathname] });
    if (url.pathname.endsWith('/@capacitor_core.js')) return route.fulfill({ contentType: 'application/javascript', body: 'export const Capacitor = { isNativePlatform: () => window.__native, getPlatform: () => window.__native ? "android" : "web", convertFileSrc: x => x }; export const registerPlugin = () => ({});' });
    if (url.pathname.endsWith('/@capacitor_app.js')) return route.fulfill({ contentType: 'application/javascript', body: 'export const App = { addListener: async (name, cb) => { if (name === "backButton") window.__back = cb; else window.__url = cb; return { remove: () => {} }; }, minimizeApp: async () => { window.__minimized++; } };' });
    if (url.pathname.endsWith('/@capacitor_keyboard.js')) return route.fulfill({ contentType: 'application/javascript', body: 'export const Keyboard = { hide: async () => {} };' });
    if (url.pathname.endsWith('/@capacitor_app-launcher.js')) return route.fulfill({ contentType: 'application/javascript', body: 'export const AppLauncher = { openUrl: async ({ url }) => { window.__launches.push(url); return { completed: window.__launchOK }; } };' });
    if (url.pathname === '/api/health') return route.fulfill({ status: 503, json: { status: 'unavailable' } });
    return route.continue();
  });
});

test('diagnostics preserve drafts, queue, theme and credentials; failed ping is unavailable', async ({ page }) => {
  const durable = {
    wawasan_pending_orders: '[{"idempotencyKey":"local-fixture","orderPayload":{"name":"Local sample"},"queuedAt":1}]',
    wawasan_order_draft_state: '{"guests":20}', wawasan_admin_token: 'local-fixture-token', app_theme: 'dark',
  };
  await page.addInitScript(values => Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value)), durable);
  await page.goto('/__app-integrity?screen=diagnostics');
  const trigger = page.getByRole('button', { name: 'Open fixture' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Unavailable', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Desktop Web', { exact: true })).toBeVisible();
  await expect(dialog.locator('input[type="color"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Wipe Temporary Cache' }).click();
  await expect(dialog.getByText('Cleaned!', { exact: true })).toBeVisible();
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(durable))).toEqual(durable);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('web download opens promptly without fabricated percent or a forced reload', async ({ page }) => {
  await page.clock.install();
  await page.goto('/__app-integrity?screen=update-web');
  await page.getByRole('button', { name: 'Open fixture' }).click();
  await page.getByRole('button', { name: 'Update Now (Download APK)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('APK link opened');
  expect(await page.evaluate(() => (window as unknown as { __downloads: string[] }).__downloads)).toEqual(['https://local.invalid/Wawasan.apk']);
  await expect(page.getByRole('dialog')).not.toContainText(/\d+%/);
  await page.clock.fastForward(10000);
  await expect(page.getByRole('status')).toContainText('APK link opened');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('failed native URL handoff exposes Retry rather than claiming a completed download', async ({ page }) => {
  await page.goto('/__app-integrity?screen=update-native');
  await page.evaluate(() => { (window as unknown as { __launchOK: boolean }).__launchOK = false; });
  await page.getByRole('button', { name: 'Open fixture' }).click();
  await page.getByRole('button', { name: 'Update Now (Download APK)', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not open');
  await page.evaluate(() => { (window as unknown as { __launchOK: boolean }).__launchOK = true; });
  await page.getByRole('button', { name: 'Update Now (Download APK)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('APK link opened');
});

test('closing during delayed OTA does not open a fallback browser later', async ({ page }) => {
  await page.goto('/__app-integrity?screen=update-ota');
  await page.getByRole('button', { name: 'Open fixture' }).click();
  await page.getByRole('button', { name: 'Instant Live Update (Capgo OTA)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Downloading and applying');
  await expect(page.getByRole('dialog')).not.toContainText(/\d+%/);
  await page.evaluate(() => {
    const fixture = window as unknown as { __close: () => void; __finishOTA: (ok: boolean) => void };
    fixture.__close();
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __finishOTA: (ok: boolean) => void }).__finishOTA(false));
  expect(await page.evaluate(() => (window as unknown as { __launches: string[] }).__launches)).toEqual([]);
});

test('Back closes the focused overlay, then consumes a wizard step, then navigates', async ({ page }) => {
  await page.goto('/__app-integrity?screen=back');
  await expect(page.getByRole('button', { name: 'Close child' })).toBeFocused();
  const back = () => page.evaluate(() => (window as unknown as { __back: (event: { canGoBack: boolean }) => void }).__back({ canGoBack: true }));
  await back();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Parent dialog' })).toBeVisible();
  await back();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => {
    document.addEventListener('wawasan:order-step-back', event => event.preventDefault(), { once: true });
  });
  await back();
  await expect(page.locator('#route')).toHaveText('/order');
  await back();
  await expect(page.locator('#route')).toHaveText('/home');
  await back();
  expect(await page.evaluate(() => (window as unknown as { __toasts: number }).__toasts)).toBe(1);
  await back();
  expect(await page.evaluate(() => (window as unknown as { __minimized: number }).__minimized)).toBe(1);
});


test('native URL and notification actions navigate only to existing allowed screens', async ({ page }) => {
  await page.goto('/__app-integrity?screen=links');
  await expect(page.locator('#route')).toHaveText('/home');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('wawasan:push_action', { detail: { type: 'order_status', orderId: 'local-order' } })));
  await expect(page.locator('#route')).toHaveText('/profile');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('wawasan:push_action', { detail: { type: 'cancel_requested', orderId: 'local-order' } })));
  await expect(page.locator('#route')).toHaveText('/admin');
  await page.evaluate(() => (window as unknown as { __url: (event: { url: string }) => void }).__url({ url: 'wawasanpakusop://app/calendar?month=2026-12' }));
  await expect(page.locator('#route')).toHaveText('/calendar');
  await page.evaluate(() => (window as unknown as { __url: (event: { url: string }) => void }).__url({ url: 'https://untrusted.invalid/admin' }));
  await expect(page.locator('#route')).toHaveText('/calendar');
});

test('Back on welcome minimizes without dismissing welcome or navigating hidden screens', async ({ page }) => {
  await page.goto('/__app-integrity?screen=welcome-back');
  await expect(page.getByRole('button', { name: 'Close child' })).toBeFocused();
  await page.evaluate(() => (window as unknown as { __back: (event: { canGoBack: boolean }) => void }).__back({ canGoBack: true }));
  expect(await page.evaluate(() => (window as unknown as { __minimized: number }).__minimized)).toBe(1);
  await expect(page.locator('#route')).toHaveText('/order');
  await expect(page.getByRole('alertdialog')).toBeVisible();
});
