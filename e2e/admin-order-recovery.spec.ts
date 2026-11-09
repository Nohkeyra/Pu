import { test, expect } from '@playwright/test';

test('admin order reads distinguish failure from empty, retain records and recover on retry', async ({ page }) => {
  page.on('pageerror', error => console.error('Admin recovery fixture:', error.message));
  let unavailable = true;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/__audit-admin') return route.fulfill({ contentType: 'text/html', body: `
      <div id="root"></div><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import { useAdminOrders } from '/src/hooks/admin/useAdminOrders.ts';
      const t = value => value, toast = () => {};
      function Fixture() {
        const state = useAdminOrders({ adminToken: 'isolated-fixture', t, toast });
        return React.createElement('div', null,
          state.loading ? React.createElement('p', null, 'Loading') : null,
          state.ordersError ? React.createElement('p', { role: 'alert' }, 'Read failed') : null,
          ...state.orders.map(order => React.createElement('p', { key: order.id }, order.name)),
          React.createElement('button', { onClick: () => state.fetchOrders() }, 'Retry'),
          React.createElement('button', { onClick: () => state.fetchOrders(true) }, 'Refresh'));
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Fixture));
      </script>` });
    // The actual production hook runs with simulated Firestore failure and API data.
    if (url.pathname === '/src/firebaseConfig.ts') return route.fulfill({ contentType: 'application/javascript', body: 'export const db = {};' });
    if (url.pathname.endsWith('/firebase_firestore.js')) return route.fulfill({ contentType: 'application/javascript', body: `
      export const collection = () => ({}), query = x => x;
      export function onSnapshot(_query, _success, error) {
        const timer = setTimeout(() => error(new Error('Simulated listener failure')), 0);
        return () => clearTimeout(timer);
      }` });
    if (url.pathname === '/api/admin/orders') return route.fulfill({ status: unavailable ? 503 : 200,
      json: unavailable ? { error: 'Simulated outage' } : { success: true, orders: [{ id: 'local-order', name: 'Local audit fixture', status: 'pending' }] } });
    return route.continue();
  });
  await page.goto('/__audit-admin');
  await expect(page.getByRole('alert')).toHaveText('Read failed');
  await expect(page.getByText('Loading', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Local audit fixture')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  unavailable = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Local audit fixture')).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
