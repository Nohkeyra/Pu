import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileNavigation } from './ProfileNavigation';

const translate = (en: string, bm: string) => en || bm;

function renderTab(selected: 'orders' | 'profile' | 'locations' | 'preferences') {
  return renderToStaticMarkup(
    React.createElement(ProfileNavigation, {
      idPrefix: 'wawasan-profile',
      value: selected,
      onChange: () => {},
      t: translate,
    }),
  );
}

describe('Wawasan profile tab motion', () => {
  it('preserves one selected accessible tab and the matching panel relationship', () => {
    const html = renderTab('orders');
    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) || []).length).toBe(4);
    expect((html.match(/aria-selected="true"/g) || []).length).toBe(1);
    expect(html).toContain('id="wawasan-profile-tab-orders"');
    expect(html).toContain('aria-controls="wawasan-profile-panel-orders"');
    expect(html).toContain('tabindex="0"');
    expect((html.match(/bg-\[var\(--color-sunshine-cta\)\]/g) || []).length).toBe(1);
  });

  it('moves the active semantics to a new tab while preserving four focusable controls', () => {
    const html = renderTab('locations');
    expect((html.match(/role="tab"/g) || []).length).toBe(4);
    expect((html.match(/aria-selected="true"/g) || []).length).toBe(1);
    expect(html).toContain('id="wawasan-profile-tab-locations"');
    expect(html).toContain('aria-controls="wawasan-profile-panel-locations"');
    expect((html.match(/tabindex="0"/g) || []).length).toBe(1);
  });
});
