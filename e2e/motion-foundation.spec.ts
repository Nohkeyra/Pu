import { test, expect, type Route } from '@playwright/test';
import { DEFAULT_MENU_ITEMS } from '../src/constants/menu';

// Actual Phase 1/2 components; all notifications, API data, tiles and routes below
// are local test doubles. No native notification or live GPS service is invoked.
const fixture = `
<meta name="viewport" content="width=device-width, initial-scale=1" />
<div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import RefreshRuntime from '/@react-refresh';
import '/src/index.css';
import '/src/styles/wawasan-four-colour-theme.css';
import '/src/components/delivery/rider-tracking.css';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
const [{ MemoryRouter }, { Step5OrderSuccess }, { RiderRouteMap }] = await Promise.all([
  import('/node_modules/.vite/deps/react-router-dom.js'),
  import('/src/components/order/Step5OrderSuccess.tsx'),
  import('/src/components/delivery/RiderRouteMap.tsx'),
]);
const noop = () => {};
function Fixture() {
  const [bm, setBm] = React.useState(false);
  const [reference, setReference] = React.useState('LOCAL-001');
  const [finished, setFinished] = React.useState(false);
  const screen = new URLSearchParams(location.search).get('screen');
  return React.createElement(MemoryRouter, null,
    screen === 'success' ? React.createElement(React.Fragment, null,
      React.createElement('button', { onClick: () => setBm(x => !x) }, 'Change language'),
      React.createElement('button', { onClick: () => setReference('LOCAL-002') }, 'New reference'),
      React.createElement(Step5OrderSuccess, {
        orderState: { name: 'Local sample', contact: '', email: '', date: '2026-12-06', guests: 20, mealTypes: ['tengahari'] },
        referenceNumber: reference, getMealTypesLabel: () => 'Lunch', emailStatus: 'idle',
        setShowPdfPreviewModal: noop, handleResetForm: noop, handleShareReceipt: noop,
        tText: (en, ms) => bm ? ms : en,
      })) : React.createElement(React.Fragment, null,
      React.createElement('button', { onClick: () => setFinished(true) }, 'Complete'),
      React.createElement(RiderRouteMap, {
        address: '2.9305,101.6788', rider: { lat: 2.9301, lng: 101.6781 },
        live: true, finished, bm: false, onDestination: noop,
      })));
}
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(Fixture)));
</script>`;

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test.describe(`Phase 1/2 review: ${reducedMotion}`, () => {
    test.use({ viewport: { width: 393, height: 851 }, reducedMotion });

    test('one received notification per actual reference, including StrictMode and language changes', async ({ page }) => {
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
        if (url.pathname === '/__motion-foundation') return route.fulfill({ contentType: 'text/html', body: fixture });
        if (url.pathname === '/src/lib/nativeService.ts') return route.fulfill({ contentType: 'application/javascript', body: `
          export const launchWhatsApp = async () => {};
          export async function scheduleLocalNotification() {
            document.body.dataset.notificationCount = String(Number(document.body.dataset.notificationCount || 0) + 1);
          }` });
        return route.continue();
      });
      await page.goto('/__motion-foundation?screen=success');
      await expect(page.locator('body')).toHaveAttribute('data-notification-count', '1');
      await page.getByRole('button', { name: 'Change language' }).click();
      await expect(page.getByRole('heading', { name: 'Tempahan dihantar!' })).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-notification-count', '1');
      await page.getByRole('button', { name: 'New reference' }).click();
      await expect(page.locator('body')).toHaveAttribute('data-notification-count', '2');
    });

    test('completion retains the route fade when an in-flight refresh fails', async ({ page }) => {
      let requests = 0;
      let pending: Route | undefined;
      await page.clock.install();
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'router.project-osrm.org') {
          requests++;
          if (requests > 1) { pending = route; return; }
          return route.fulfill({ json: { routes: [{ geometry: { coordinates: [[101.6781, 2.9301], [101.6788, 2.9305]] } }] } });
        }
        if (url.hostname === 'tile.openstreetmap.org') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVYQAAAAASUVORK5CYII=', 'base64') });
        if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
        if (url.pathname === '/__motion-foundation') return route.fulfill({ contentType: 'text/html', body: fixture });
        return route.continue();
      });
      await page.goto('/__motion-foundation?screen=map');
      const line = page.locator('.rider-route-line');
      await expect(line).toHaveCount(1);
      await page.clock.fastForward(30_000);
      await expect.poll(() => Boolean(pending)).toBe(true);
      await page.getByRole('button', { name: 'Complete', exact: true }).click();
      await pending!.fulfill({ status: 503, body: 'Simulated route refresh failure' });
      await expect(page.locator('.rider-map--completed')).toHaveCount(1);
      await expect(line).toHaveCount(1);
      await expect(line).toHaveCSS('stroke-opacity', '0');
      await expect(page.getByText('Route unavailable. Location markers remain visible.')).toHaveCount(0);
      await page.clock.fastForward(31_000);
      expect(requests).toBe(2);
    });

    test('a step handoff never restores the outgoing form or slides the new form back across the screen', async ({ page }) => {
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
        if (url.pathname === '/api/menu') return route.fulfill({ json: { success: true, menuItems: DEFAULT_MENU_ITEMS } });
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { success: true, orders: [], sessions: {} } });
        return route.continue();
      });
      await page.addInitScript(() => {
        localStorage.setItem('wawasan_language', 'en');
        localStorage.setItem('wawasan_order_draft_step', '2');
        localStorage.setItem('wawasan_order_draft_state', JSON.stringify({ eventType: 'lain', mealTypes: ['tengahari'], guests: 20, dishes: [], veggies: [], customMenu: 'Local sample' }));
        localStorage.setItem('wawasan_ghost_demo_seen_v1', '1');
        localStorage.setItem('wawasan_privacy_acknowledged', 'true');
        sessionStorage.setItem('wawasan_privacy_completed', 'true');
        sessionStorage.setItem('wawasan_session_started', 'true');
      });
      await page.goto('/#/order');
      await expect(page.locator('[data-tour="step2-next"]')).toBeVisible({ timeout: 20_000 });
      const expectSummaryBelowForm = async () => {
        const positions = await page.evaluate(() => ({
          summary: document.querySelector('.customer-order-aside')!.getBoundingClientRect().top,
          form: document.querySelector('.customer-form-panel')!.getBoundingClientRect().bottom,
        }));
        expect(positions.summary).toBeGreaterThanOrEqual(positions.form);
      };
      await expectSummaryBelowForm();
      if (reducedMotion === 'no-preference') {
        await page.waitForFunction(() => ((document.querySelector('video[src*="daun_penarik"]') as HTMLVideoElement | null)?.readyState ?? 0) >= 2);
      }
      await page.evaluate(() => {
        const faults: string[] = [];
        Object.assign(window, { handoffFaults: faults });
        const form = document.querySelector('.customer-order-form')!;
        new MutationObserver(() => {
          if (form.getAttribute('data-step') !== '3') return;
          if (form.querySelector('[data-tour="step2-next"]')) faults.push('outgoing step restored');
          const shell = form.querySelector('.customer-step-content > div');
          if (shell && Math.abs(new DOMMatrix(getComputedStyle(shell).transform).m41) > 1) faults.push('new step re-enters with old pull');
        }).observe(form, { attributes: true, childList: true, subtree: true });
      });
      await page.locator('[data-tour="step2-next"]').click();
      await expect(page.locator('#contact-name')).toBeVisible();
      const faults = await page.evaluate(() => (window as unknown as { handoffFaults: string[] }).handoffFaults);
      expect(faults).toEqual([]);
      await expectSummaryBelowForm();
      if (reducedMotion === 'reduce') {
        await expect(page.locator('.customer-step-content > div > div')).toHaveCSS('opacity', '1');
        await page.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(page.locator('[data-tour="step2-next"]')).toBeVisible();
        await expectSummaryBelowForm();
        await page.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(page.locator('.customer-step-one')).toBeVisible();
        await expectSummaryBelowForm();
      }
    });
  });
}
