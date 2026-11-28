import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { sortOrdersByCreatedAt } from '@/lib/orderTimestamp';
import type { Order } from '@/types';

interface CustomerOrdersSnapshot {
  userId: string;
  orders: Order[];
  status: 'loading' | 'ready' | 'error';
}

const emptyOrders: Order[] = [];

export function useCustomerOrders(userId: string | undefined) {
  const [snapshot, setSnapshot] = useState<CustomerOrdersSnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) {
      setSnapshot(null);
      return;
    }
    let active = true;
    setSnapshot((previous) => ({
      userId,
      orders: previous?.userId === userId ? previous.orders : emptyOrders,
      status: 'loading',
    }));
    const ref = collection(db, 'orders');
    const owner = where('userId', '==', userId);
    const customerOrders = import.meta.env.VITE_FIRESTORE_ORDER_VISIBILITY_READY === 'true'
      ? query(ref, owner, where('deletedByUser', '==', false))
      : query(ref, owner);
    const unsubscribe = onSnapshot(customerOrders, (result) => {
      if (!active) return;
      const orders: Order[] = [];
      result.forEach((document) => {
        const order = document.data() as Order;
        if (!order.deletedByUser) orders.push({ ...order, id: document.id });
      });
      setSnapshot({ userId, orders: sortOrdersByCreatedAt(orders), status: 'ready' });
    }, (error) => {
      if (!active) return;
      console.error('Error fetching customer orders:', error);
      setSnapshot((previous) => ({
        userId,
        orders: previous?.userId === userId ? previous.orders : emptyOrders,
        status: 'error',
      }));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, attempt]);

  const current = snapshot?.userId === userId ? snapshot : null;
  return {
    orders: current?.orders ?? emptyOrders,
    isLoadingOrders: Boolean(userId && (!current || current.status === 'loading')),
    ordersError: current?.status === 'error',
    retryOrders: () => setAttempt((previous) => previous + 1),
  };
}
