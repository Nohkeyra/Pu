import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MenuItemCard } from './MenuItemCard';
import { Step5OrderSuccess } from './Step5OrderSuccess';

const english = (en: string, bm: string) => en || bm;

describe('Wawasan order motion — accessible state and meaning', () => {
  it('keeps menu choices as real toggle buttons while the visual marker changes', () => {
    const item = { id: 'soto', nameEn: 'Soto', nameBm: 'Soto', category: 'lunch' };
    const render = (isSelected: boolean) => renderToStaticMarkup(
      React.createElement(MenuItemCard, {
        item,
        isSelected,
        onToggle: () => {},
        tText: english,
      }),
    );
    const before = render(false);
    const after = render(true);
    expect(before).toContain('aria-pressed="false"');
    expect(after).toContain('aria-pressed="true"');
    expect(after).toContain('aria-label="Soto"');
    expect(before).toContain('customer-menu-card-mark');
    expect(after).toContain('customer-menu-card-mark');
    expect(after).toContain('customer-menu-card-name');
  });

  it('stamps only the received request, retaining pending-review status and reference', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null,
        React.createElement(Step5OrderSuccess, {
          orderState: {
            name: 'Customer',
            contact: '0100000000',
            email: 'customer@example.com',
            date: '2026-12-06',
            mealTypes: ['tengahari'],
            guests: 20,
          },
          referenceNumber: 'RW-TEST-001',
          getMealTypesLabel: () => 'Lunch',
          emailStatus: 'idle',
          setShowPdfPreviewModal: () => {},
          handleResetForm: () => {},
          handleShareBookingReference: () => {},
          tText: english,
        }),
      ),
    );
    expect(html).toContain('WAWASAN');
    expect(html).toContain('RECEIVED');
    expect(html).toContain('PENDING REVIEW');
    expect(html).toContain('RW-TEST-001');
    expect(html).not.toContain('Booking confirmed');
  });
});
