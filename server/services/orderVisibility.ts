/** Enable only after all orders have explicit boolean flags. */
export function activeAdminOrders(db: FirebaseFirestore.Firestore): FirebaseFirestore.Query {
  const orders = db.collection('orders');
  return process.env.FIRESTORE_ORDER_VISIBILITY_READY === 'true'
    ? orders.where('deletedByAdmin', '==', false)
    : orders;
}
