import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderStatusBadge } from './OrderStatusBadge';

const render = (status: string, language: 'en' | 'bm') => renderToStaticMarkup(
  React.createElement(OrderStatusBadge, { status, language }),
);

describe('Wawasan order status color handoff', () => {
  it('preserves the actual pending state instead of presenting approval or delivery', () => {
    const html = render('pending', 'bm');
    expect(html).toContain('data-status="pending"');
    expect(html).toContain('Dalam semakan');
    expect(html).toContain('motion-safe:transition-colors');
    expect(html).not.toContain('Selesai');
  });

  it('shows the verified in-transit and completed states without extra notifications', () => {
    const inTransit = render('in_transit', 'en');
    const completed = render('completed', 'en');
    expect(inTransit).toContain('data-status="in_transit"');
    expect(inTransit).toContain('In transit');
    expect(completed).toContain('data-status="completed"');
    expect(completed).toContain('Completed');
    expect(inTransit).not.toContain('aria-live=');
    expect(completed).not.toContain('aria-live=');
  });
});
