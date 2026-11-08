/**
 * Public calendar records have no customer details. Enrich ONLY records that
 * belong to the signed-in user (or the authorized admin stream), keyed by ID.
 * This keeps data loading order independent: late public requests must not
 * replace private Firestore records with redacted placeholders.
 */
export function mergeCalendarOrders<T extends { id?: string }>(
  publicOrders: readonly T[],
  authorizedOrders: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const order of publicOrders) {
    if (order.id) byId.set(order.id, order);
  }
  for (const order of authorizedOrders) {
    if (order.id) byId.set(order.id, order);
  }
  return Array.from(byId.values());
}
