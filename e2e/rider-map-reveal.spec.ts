import { test, expect } from '@playwright/test';

// Real order cards, dialog, Leaflet and reveal animation. Only GPS/service data,
// routing and map tile images are simulated. This is browser proof, not APK footage.
const fixture = `
<meta name="viewport" content="width=device-width, initial-scale=1" />
<div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import RefreshRuntime from '/@react-refresh';
import '/src/index.css';
import '/src/styles/wawasan-four-colour-theme.css';
import '/src/components/ui/shared-interface.css';
import '/src/components/profile/profile-dashboard.css';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
const [{ MemoryRouter }, { LanguageProvider }, { ToastProvider }, { ProfileOrdersTab }, { DeliveryMap }] = await Promise.all([
  import('/node_modules/.vite/deps/react-router-dom.js'),
  import('/src/context/LanguageContext.tsx'),
  import('/src/components/ui/Toast.tsx'),
  import('/src/components/profile/ProfileOrdersTab.tsx'),
  import('/src/components/delivery/DeliveryMap.tsx'),
]);
const noop = () => {}, asyncNoop = async () => {};
const order = { id: 'local-map-proof', name: 'Local sample', status: 'in_transit',
  date: '2026-12-06', guests: 20, quantity: 20, meals: ['lunch'], dishes: ['Soto'],
  location: '2.9305,101.6788', locationCoordinates: { lat: 2.9305, lng: 101.6788 } };
function Fixture() {
  const [tracking, setTracking] = React.useState(null);
  return React.createElement(LanguageProvider, null, React.createElement(ToastProvider, null,
    React.createElement(MemoryRouter, null,
      React.createElement('main', { className: 'profile-dashboard', style: { maxWidth: 720, padding: 20, margin: '0 auto' } },
        React.createElement(ProfileOrdersTab, {
          orders: [order], isLoadingOrders: false, language: 'en', selectedOrders: new Set(),
          isSelectMode: false, setIsSelectMode: noop, setShowCombineModal: noop,
          handleToggleOrderSelect: noop, handleSelectAllForCombine: noop, onReorder: noop,
          handleRequestInvoiceEmail: asyncNoop, pokingOrderId: null, setPreviewOrder: noop,
          setConfirmDialog: noop, cancellingOrderId: null, deletingOrderId: null,
          setTrackingOrder: (order, origin) => setTracking({ order, origin }), t: en => en,
        })),
      tracking && React.createElement(DeliveryMap, {
        order: tracking.order, origin: tracking.origin, onClose: () => setTracking(null),
      }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Fixture)));
</script>`;

test.use({ video: { mode: 'on', size: { width: 393, height: 851 } } });

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const dark of [false, true]) {
    for (const width of [393, 1280]) {
      test(`rider reveal ${reducedMotion} ${dark ? 'dark' : 'light'} ${width}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => { errors.push(error.message); console.error('Rider reveal fixture:', error.message); });
        await page.setViewportSize({ width, height: 851 });
        await page.emulateMedia({ reducedMotion });
        await page.addInitScript(() => localStorage.setItem('wawasan_language', 'en'));
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.hostname === 'router.project-osrm.org') return route.fulfill({ json: { routes: [{ geometry: { coordinates: [[101.6781, 2.9301], [101.6788, 2.9305]] } }] } });
          if (url.hostname === 'tile.openstreetmap.org') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVYQAAAAASUVORK5CYII=', 'base64') });
          if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
          if (url.pathname === '/__rider-reveal') return route.fulfill({ contentType: 'text/html', body: fixture });
          if (url.pathname === '/src/hooks/delivery/useRiderTracking.ts') return route.fulfill({ contentType: 'application/javascript', body: `
            const now = Date.now(), timestamp = new Date(now).toISOString();
            const snapshot = { status: 'in_transit', session: { id: 'local', active: true, expiresAt: new Date(now + 600000).toISOString() },
              riderLocation: { lat: 2.9301, lng: 101.6781, accuracy: 8, source: 'gps', active: true, sessionId: 'local', capturedAt: timestamp, updatedAt: timestamp } };
            export const useRiderTracking = () => ({ snapshot, connection: 'connected', device: { active: false, phase: 'idle' }, now, refresh: () => {} });` });
          return route.continue();
        });
        await page.goto('/__rider-reveal');
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
        const trigger = page.getByRole('button', { name: 'Track Delivery', exact: true });
        await expect(trigger).toBeVisible();
        const card = page.locator('.profile-order-card');
        await page.evaluate(() => document.fonts.ready);
        // Layout size excludes the card's independent entrance transform.
        const original = await card.evaluate(el => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
        const initialOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
        await trigger.click();
        const stage = page.locator('.rider-map-reveal');
        await expect(stage).toHaveAttribute('data-phase', 'open');
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(page.locator('.leaflet-container')).toHaveCount(1);
        await expect(page.locator('.rider-pin--live')).toHaveCount(1);
        await expect(page.locator('.rider-sheet .rider-metrics')).toHaveCount(1);
        await expect(page.locator('.rider-map .rider-metrics')).toHaveCount(0);
        const geometry = await page.evaluate(() => {
          const map = document.querySelector('.rider-map')!.getBoundingClientRect();
          const pin = document.querySelector('.rider-pin--live')!.getBoundingClientRect();
          const dock = document.querySelector('.rider-sheet')!.getBoundingClientRect();
          return { width: map.width, height: map.height, pinBottom: pin.bottom, dockTop: dock.top, dockBottom: dock.bottom, heightLimit: innerHeight };
        });
        expect(geometry.width).toBeCloseTo(width, 0);
        expect(geometry.height).toBeCloseTo(851, 0);
        expect(geometry.pinBottom).toBeLessThan(geometry.dockTop);
        expect(geometry.dockBottom).toBeLessThanOrEqual(geometry.heightLimit);
        if (reducedMotion === 'reduce') {
          expect(await stage.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
        }
        await page.screenshot({ path: test.info().outputPath('map-open.png') });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(initialOverflow);
        const restored = await card.evaluate(el => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
        expect(restored).toEqual(original);

        // Reverse during opening, then reopen and rotate while the map is alive.
        await trigger.click();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await trigger.click();
        await page.setViewportSize({ width: 851, height: 393 });
        await expect(stage).toHaveAttribute('data-phase', 'open');
        await expect(page.getByRole('button', { name: 'Close map' })).toBeVisible();
        await page.getByRole('button', { name: 'Close map' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(errors).toEqual([]);
      });
    }
  }
}
