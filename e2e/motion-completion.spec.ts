import { test, expect } from '@playwright/test';

// Real UI components with local sample records and inert service callbacks.
// This exercises browser interaction, not an authenticated Android session.
const fixture = `
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <div id="root"></div><script type="module">
  import React, { useState, useCallback } from '/node_modules/.vite/deps/react.js';
  import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
  import { MotionConfig } from '/node_modules/.vite/deps/motion_react.js';
  import { Switch } from '/src/components/ui/switch.tsx';
  import { AdminPdfShareModal } from '/src/components/admin/AdminPdfShareModal.tsx';
  import { OrderDetailModal } from '/src/components/admin/OrderDetailModal.tsx';
  import { AdminTablesTab } from '/src/components/admin/AdminTablesTab.tsx';
  import { ToastProvider } from '/src/components/ui/Toast.tsx';
  import '/src/index.css';
  import '/src/styles/wawasan-four-colour-theme.css';
  const noop = () => {}, t = key => key;
  const order = { id: 'local-motion-sample', name: 'Local sample', status: 'pending',
    date: '2026-12-06', meals: ['lunch'], menu: 'Soto', quantity: 20 };
  function Fixture() {
    const [checked, setChecked] = useState(false);
    const [panel, setPanel] = useState('');
    const onClose = useCallback(() => setPanel(''), []);
    return React.createElement(MotionConfig, { reducedMotion: 'user' },
      React.createElement(ToastProvider, null,
        React.createElement('main', { style: { padding: 24 } },
          React.createElement(Switch, { checked, onCheckedChange: setChecked, 'aria-label': 'Analytics' }),
          React.createElement('button', { onClick: () => setPanel('pdf') }, 'Open PDF'),
          React.createElement('button', { onClick: () => setPanel('order') }, 'Open order'),
          React.createElement(AdminTablesTab, {
            orders: [order], language: 'en', openOrderDetail: () => setPanel('order'),
            handlePreviewPDF: noop, handleDownloadPDF: noop, handleDelete: noop,
            fetchOrders: async () => {}, authHeaders: () => ({}), getApiUrl: x => x, toast: noop,
          })),
        React.createElement(AdminPdfShareModal, { isOpen: panel === 'pdf', onClose,
          previewFileName: 'Local sample.pdf', previewPdfUrl: '', t, language: 'en', toast: noop }),
        React.createElement(OrderDetailModal, { isOpen: panel === 'order', onClose,
          selectedOrder: order, t, language: 'en', prices: { lunch: '9' }, setPrices: noop,
          getStatusBadge: () => 'Pending', isApproving: false, handleCancelOrderAdmin: noop,
          handleRejectCancellation: noop, handleApprove: noop, handleRejectOrder: noop,
          openSendDialog: noop })));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Fixture));
  </script>`;

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const dark of [false, true]) {
    for (const viewport of [{ width: 393, height: 851 }, { width: 1280, height: 900 }]) {
      test(`motion handoff: ${reducedMotion}, ${dark ? 'dark' : 'light'}, ${viewport.width}px`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion });
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
          if (url.pathname === '/__motion-completion') {
            return route.fulfill({ contentType: 'text/html', body: fixture });
          }
          return route.continue();
        });
        await page.goto('/__motion-completion');
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);

        const toggle = page.getByRole('switch', { name: 'Analytics' });
        await expect(toggle).not.toBeChecked();
        const thumb = toggle.locator('[data-slot="switch-thumb"]');
        const start = await thumb.boundingBox();
        await toggle.focus();
        await page.keyboard.press('Space');
        await expect(toggle).toBeChecked();
        await expect.poll(async () => (await thumb.boundingBox())!.x - start!.x).toBeGreaterThan(8);
        if (reducedMotion === 'reduce') {
          expect(await thumb.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
        }
        await page.keyboard.press('Space');
        await expect(toggle).not.toBeChecked();
        await expect.poll(async () => Math.abs((await thumb.boundingBox())!.x - start!.x)).toBeLessThan(0.5);

        for (const [label, id] of [['Open PDF', 'pdf-preview-dialog-container'], ['Open order', 'order-detail-dialog-container']]) {
          const trigger = page.getByRole('button', { name: label, exact: true });
          await trigger.click();
          const panel = page.locator('#' + id);
          await expect(panel).toBeVisible();
          const samples = await panel.evaluate(async el => {
            const samples = [];
            for (let i = 0; i < 20; i++) {
              const style = getComputedStyle(el);
              const matrix = new DOMMatrix(style.transform);
              samples.push({ scaleX: matrix.a, scaleY: matrix.d, y: matrix.f, opacity: Number(style.opacity) });
              await new Promise(requestAnimationFrame);
            }
            return samples;
          });
          for (const sample of samples) {
            expect(sample.scaleX).toBeCloseTo(1, 3);
            expect(sample.scaleY).toBeCloseTo(1, 3);
            expect(sample.y).toBeGreaterThanOrEqual(-0.1);
            expect(sample.y).toBeLessThanOrEqual(12.1);
            if (reducedMotion === 'reduce') {
              expect(sample.y).toBeCloseTo(0, 3);
              expect(sample.opacity).toBe(1);
            }
          }
          expect(samples.at(-1)!.opacity).toBe(1);
          expect(await panel.evaluate(el => el.contains(document.activeElement))).toBe(true);
          // Focus wraps back to the last control when Shift+Tab is pressed at the first.
          const controls = panel.locator('button:enabled:visible, input:enabled:visible, select:enabled:visible, textarea:enabled:visible, a[href]:visible');
          await controls.first().focus();
          await page.keyboard.press('Shift+Tab');
          await expect(controls.last()).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await expect(trigger).toBeFocused();
          expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        }

        if (viewport.width === 1280) {
          await page.getByRole('button', { name: 'Open Actions', exact: true }).click();
          await page.getByRole('button', { name: 'View', exact: true }).click();
          await expect(page.locator('#order-detail-dialog-container')).toBeVisible();
          await page.keyboard.press('Escape');
          await page.getByRole('button', { name: 'Close', exact: true }).click();
          await expect(page.getByRole('button', { name: 'View', exact: true })).toHaveCount(0);
        }
        expect(errors).toEqual([]);
      });
    }
  }
}
