import { describe, it, expect } from 'vitest';

describe('Calendar Orders Mapping & Id Assignment', () => {
  it('correctly maps order id when deleted orders exist in the snapshot', () => {
    const mockSnapshotDocs = [
      {
        id: 'order-1',
        data: () => ({ name: 'Customer 1', deletedByAdmin: false, eventDate: '2026-09-01', status: 'pending' }),
      },
      {
        id: 'order-2-deleted',
        data: () => ({ name: 'Customer 2', deletedByAdmin: true, eventDate: '2026-09-01', status: 'pending' }),
      },
      {
        id: 'order-3',
        data: () => ({ name: 'Customer 3', deletedByAdmin: false, eventDate: '2026-09-02', status: 'approved' }),
      },
    ];

    // Correct mapping implementation
    const mappedOrders = mockSnapshotDocs
      .filter(doc => !doc.data().deletedByAdmin)
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          status: d.status || 'pending',
          eventDate: d.eventDate || null,
        };
      });

    expect(mappedOrders).toHaveLength(2);
    expect(mappedOrders[0].id).toBe('order-1');
    expect(mappedOrders[1].id).toBe('order-3'); // Must NOT be 'order-2-deleted'
    expect(mappedOrders[1].eventDate).toBe('2026-09-02');
  });
});
