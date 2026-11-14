import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order } from '@/types';
import { getApiUrl } from '@/lib/api';
import { showConfirm } from '@/lib/nativeService';
import type { ToastVariant } from '@/components/ui/Toast';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { sortOrdersByCreatedAt } from '@/lib/orderTimestamp';

interface UseAdminOrdersProps {
  adminToken?: string;
  onLogout?: () => void;
  toast: (opts: { title?: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
  t: (key: string) => string;
  language?: string;
}

export function useAdminOrders({ adminToken, onLogout, toast, t, language }: UseAdminOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const requestSequence = useRef(0);
  const fallbackActive = useRef(false);
  const invalidateRequests = useCallback(() => ++requestSequence.current, []);

  // Use refs for callbacks to prevent infinite re-renders
  const onLogoutRef = useRef(onLogout);
  const toastRef = useRef(toast);
  const tRef = useRef(t);

  useEffect(() => {
    onLogoutRef.current = onLogout;
    toastRef.current = toast;
    tRef.current = t;
  }, [onLogout, toast, t]);

  const authHeaders = useCallback((): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  }), [adminToken]);

  const fetchOrders = useCallback(async (silent?: boolean) => {
    if (!adminToken) return;
    const requestId = invalidateRequests();
    if (!silent) setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ action: 'fetch', includeAll: true })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
          if (requestId === requestSequence.current) {
            setOrders(sortOrdersByCreatedAt(data.orders as Order[], 'desc'));
            setOrdersError(false);
          }
        } else {
          throw new Error('Invalid orders response');
        }
      } else if (response.status === 401 || response.status === 403) {
        if (requestId === requestSequence.current) onLogoutRef.current?.();
      } else {
        throw new Error(`Orders unavailable (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching admin orders via API:', err);
      if (requestId === requestSequence.current) setOrdersError(true);
    } finally {
      if (!silent && requestId === requestSequence.current) setLoading(false);
    }
  }, [adminToken, authHeaders, invalidateRequests]);

  useEffect(() => {
    invalidateRequests();
    fallbackActive.current = false;
    if (!adminToken) {
      setLoading(false);
      setOrders([]);
      setOrdersError(false);
      return;
    }

    // The listener is primary and reads all orders before local sorting so legacy
    // records remain eligible. Use the REST fallback only if the listener fails.
    // Do not orderBy/limit in Firestore: legacy records may lack createdAt or use mixed types.
    let disposed = false;
    const q = query(collection(db, 'orders'));
    
    const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        if (disposed) return;
        invalidateRequests();
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.deletedByAdmin) {
            return;
          }
          
          fetchedOrders.push({ 
            id: docSnap.id, 
            ...data,
          } as Order);
        });
      setOrders(sortOrdersByCreatedAt(fetchedOrders, 'desc'));
      setOrdersError(false);
      setLoading(false);
    }, (error) => {
      if (disposed) return;
      fallbackActive.current = true;
      console.warn('[Admin Orders] Real-time Firestore snapshot inactive, falling back to Admin API:', error.message);
      // Only hit the REST endpoint when the live listener can't run at all
      // (e.g. Firestore rules reject it) — the single fallback path instead
      // of an unconditional duplicate fetch on every mount.
      fetchOrders(false);
    });

    return () => {
      disposed = true;
      invalidateRequests();
      unsubscribeSnapshot();
    };
  }, [adminToken, fetchOrders, invalidateRequests]);

  const handleUpdateOrderStatus = async (orderId: string, data: Partial<Order>, successMsg?: string) => {
    setIsApproving(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data
        })
      });

      if (response.ok) {
        const saved = await response.json();
        setOrders(current => current.map(order => order.id === orderId
          ? { ...order, ...data, ...(saved.invoiceNo ? { invoiceNo: saved.invoiceNo } : {}) } : order));
        if (fallbackActive.current) await fetchOrders(true);
        if (successMsg) {
          toastRef.current({
            title: tRef.current('success'),
            description: successMsg,
            variant: 'success'
          });
        }
        return true;
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update order');
    } catch (error) {
      console.error('Error updating order:', error);
      toastRef.current({
        title: tRef.current('error'),
        description:
          error instanceof Error && error.message && error.message !== 'Failed to update order'
            ? error.message
            : tRef.current('error_updating') || 'Failed to update order.',
        variant: 'error'
      });
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const isConfirmed = await showConfirm({
      title: tRef.current('confirm_action') || 'Confirm Action',
      message: tRef.current('delete_order_confirm') || 'Are you sure you want to delete this order?'
    });
    if (!isConfirmed) return;
    
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'delete',
          orderId
        })
      });
      if (response.ok) {
        setOrders(current => current.filter(order => order.id !== orderId));
        if (fallbackActive.current) await fetchOrders(true);
        toastRef.current({
          title: tRef.current('success'),
          description: tRef.current('order_deleted'),
          variant: 'success'
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toastRef.current({
        title: tRef.current('error'),
        description:
          error instanceof Error && error.message
            ? error.message
            : 'Failed to delete order.',
        variant: 'error'
      });
    }
  };

  const handleBatchDelete = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    const isConfirmed = await showConfirm({
      title: tRef.current('confirm_action') || 'Confirm Action',
      message: language === 'bm'
        ? `Adakah anda pasti mahu memadam ${orderIds.length} pesanan yang dipilih?`
        : `Are you sure you want to delete ${orderIds.length} selected orders?`
    });
    if (!isConfirmed) return;

    try {
      let successCount = 0;
      for (const orderId of orderIds) {
        const response = await fetch(getApiUrl('/api/admin/orders'), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ action: 'delete', orderId })
        });
        if (response.ok) {
          successCount++;
          setOrders(current => current.filter(order => order.id !== orderId));
        }
      }
      if (fallbackActive.current) await fetchOrders(true);
      toastRef.current({
        title: tRef.current('success'),
        description: language === 'bm'
          ? `${successCount} pesanan berjaya dipadam.`
          : `${successCount} orders successfully deleted.`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Error batch deleting orders:', error);
      toastRef.current({
        title: tRef.current('error'),
        description: 'Failed to delete selected orders.',
        variant: 'error'
      });
    }
  };

  return {
    orders,
    loading,
    ordersError,
    isApproving,
    setIsApproving,
    fetchOrders,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleBatchDelete,
    authHeaders
  };
}
