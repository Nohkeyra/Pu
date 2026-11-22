import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderPreviewProgress } from './OrderPreviewProgress';

const platform = vi.hoisted(() => ({ native: false }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native },
}));

const props = {
  step: 1,
  language: 'en' as const,
  dishes: [],
  veggies: [],
  customMenu: '',
  guests: 50,
  preparationType: 'meal_box' as const,
  isDemo: false,
  isKeyboardVisible: false,
};

function renderPreview() {
  return renderToStaticMarkup(createElement(
    OrderPreviewProgress,
    { ...props, children: createElement('span', null, 'Step 1 of 4') },
  ));
}

describe('Order preview layout on native vs. web', () => {
  beforeEach(() => { platform.native = false; });

  it('keeps the large inline preview and scroll docking on the web', () => {
    const html = renderPreview();
    expect(html).toContain('customer-order-preview-anchor');
    expect(html).toContain('data-preview-docked="false"');
  });

  it('uses a stable compact preview on Android without the hidden red scene', () => {
    platform.native = true;
    const html = renderPreview();
    expect(html).not.toContain('customer-order-preview-anchor');
    expect(html).toContain('data-preview-docked="true"');
    expect(html).toContain('lc-preview-mini-row');
    expect(html).toContain('50 pax');
    expect(html).toContain('Step 1 of 4');
  });
});
