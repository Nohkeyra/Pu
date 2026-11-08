import { describe, expect, it } from 'vitest';
import { mergeCalendarOrders } from './calendarOrderVisibility';

describe('mergeCalendarOrders', () => {
  it('combines public availability and private owner records without duplication', () => {
    const publicRecords = [
      { id: 'one', status: 'pending', name: undefined as string | undefined },
      { id: 'two', status: 'approved', name: undefined as string | undefined },
    ];
    const ownRecords = [{ id: 'one', status: 'approved', name: 'Own order' }];
    const result = mergeCalendarOrders(publicRecords, ownRecords);
    expect(result).toHaveLength(2);
    expect(result.find(record => record.id === 'one')?.name).toBe('Own order');
    expect(result.find(record => record.id === 'two')?.name).toBeUndefined();
  });

  it('does not mutate inputs and retains nonoverlapping authorized records', () => {
    const publicRecords = [{ id: 'public', status: 'pending' }];
    const ownRecords = [{ id: 'private', status: 'approved' }];
    expect(mergeCalendarOrders(publicRecords, ownRecords).map(r => r.id)).toEqual(['public', 'private']);
    expect(publicRecords).toHaveLength(1);
    expect(ownRecords).toHaveLength(1);
  });
});
