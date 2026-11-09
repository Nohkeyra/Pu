import { test, expect } from '@playwright/test';
import sharp from 'sharp';

// Actual compiled header CSS in a local fixture; no account or API data.
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: batik remains visible in an opaque sandbox preview`, async ({ page, request }) => {
    const response = await request.get('/src/components/ui/presentation.css?direct');
    expect(response.ok()).toBe(true);
    const css = await response.text();
    const background = theme === 'dark' ? [48, 40, 38] : [255, 248, 236];
    const frame = `<html class="${theme === 'dark' ? 'dark' : ''}"><style>
      ${css}
      :root { --ui-action: #b34b00; --ui-yellow: #ffb02e; }
      body { margin: 0; }
      .batik-header { width: 320px; height: 160px; background: rgb(${background.join(',')}); }
      </style><div class="batik-header" aria-hidden="true"></div></html>`;
    const srcdoc = frame.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
      if (url.pathname === '/__batik-header-preview') {
        return route.fulfill({ contentType: 'text/html', body: `
          <iframe id="normal" style="width:320px;height:160px;border:0" srcdoc="${srcdoc}"></iframe>
          <iframe id="sandbox" sandbox="allow-scripts" style="width:320px;height:160px;border:0" srcdoc="${srcdoc}"></iframe>` });
      }
      return route.continue();
    });
    await page.goto('/__batik-header-preview');
    const rendered: Buffer[] = [];
    for (const id of ['normal', 'sandbox']) {
      await expect(page.frameLocator(`#${id}`).locator('.batik-header')).toBeVisible();
      // Wait for mask decoding before sampling the decorative pixels.
      await page.frameLocator(`#${id}`).locator('.batik-header').evaluate(async element => {
        const imageUrl = getComputedStyle(element, '::before').maskImage;
        const match = /^url\(["']?(.*?)["']?\)$/.exec(imageUrl);
        if (!match) throw new Error('Header motif is missing');
        await new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Header motif failed to decode'));
          image.src = match[1];
        });
      });
      const { data, info } = await sharp(await page.locator(`#${id}`).screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let patternedPixels = 0;
      for (let index = 0; index < data.length; index += info.channels) {
        if (background.some((channel, offset) => Math.abs(data[index + offset] - channel) > 5)) patternedPixels++;
      }
      expect(patternedPixels, `${id}: a plain header is missing its batik`).toBeGreaterThan(500);
      rendered.push(data);
    }
    // Allow minor compositor rounding between same-origin and isolated frames.
    expect(rendered[1].length).toBe(rendered[0].length);
    let totalDifference = 0;
    let maximumDifference = 0;
    for (let index = 0; index < rendered[0].length; index++) {
      const difference = Math.abs(rendered[0][index] - rendered[1][index]);
      totalDifference += difference;
      maximumDifference = Math.max(maximumDifference, difference);
    }
    const meanDifference = totalDifference / rendered[0].length;
    await test.info().attach('frame-render-comparison', {
      body: JSON.stringify({ theme, meanDifference, maximumDifference }),
      contentType: 'application/json',
    });
    expect(meanDifference, 'The sandbox should preserve the ordinary-frame motif').toBeLessThan(1);
  });
}
