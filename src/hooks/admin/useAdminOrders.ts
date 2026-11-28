import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdminConflictNotification, Order } from '@/types';
import { getApiUrl } from '@/lib/api';
import { showConfirm } from '@/lib/nativeService';
import type { ToastVariant } from '@/components/ui/Toast';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
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
  const [conflicts, setConflicts] = useState<AdminConflictNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const requestSequence = useRef(0);
  const notifiedConflictIds = useRef<Set<string>>(new Set());
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
    // Healthy live listener already supplies updates; avoid duplicate REST reads.
    if (!adminToken || !fallbackActive.current) return;
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

  const fetchConflicts = useCallback(async () => {
    if (!adminToken) {
      setConflicts([]);
      return;
    }
    try {
      const response = await fetch(getApiUrl('/api/admin/conflicts'), {
        headers: authHeaders(),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.conflicts)) {
        const list = data.conflicts as AdminConflictNotification[];
        setConflicts(list);
        const unseen = list.filter((c) => !notifiedConflictIds.current.has(c.id));
        if (unseen.length > 0) {
          unseen.forEach((c) => notifiedConflictIds.current.add(c.id));
          toastRef.current({
            title: language === 'bm' ? 'Konflik Harga Luar Talian' : 'Offline Pricing Conflict',
            description:
              language === 'bm'
                ? `${unseen.length} kemas kini harga luar talian ditolak kerana rekod pelayan lebih baharu.`
                : `${unseen.length} offline pricing sync update(s) rejected due to newer server changes.`,
            variant: 'warning',
            duration: 6000,
          });
        }
      }
    } catch (err) {
      console.warn('[Admin Conflicts] Unable to load conflict notifications:', err);
    }
  }, [adminToken, authHeaders, language]);

  const dismissConflict = useCallback(async (conflictId: string) => {
    if (!adminToken || !conflictId) return;
    try {
      const response = await fetch(getApiUrl(`/api/admin/conflicts/${encodeURIComponent(conflictId)}/dismiss`), {
        method: 'POST',
        headers: authHeaders(),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        setConflicts((prev) => prev.filter((item) => item.id !== conflictId));
      }
    } catch (err) {
      console.warn('[Admin Conflicts] Unable to dismiss conflict notification:', err);
    }
  }, [adminToken, authHeaders]);

  useEffect(() => {
    void fetchConflicts();
  }, [fetchConflicts]);

  useEffect(() => {
    invalidateRequests();
    fallbackActive.current = false;
    if (!adminToken) {
      setLoading(false);
      setOrders([]);
      setConflicts([]);
      setOrdersError(false);
      return;
    }

    // The listener is primary and reads all orders before local sorting so legacy
    // records remain eligible. Use the REST fallback only if the listener fails.
    // Do not orderBy/limit in Firestore: legacy records may lack createdAt or use mixed types.
    let disposed = false;
    const byId = new Map<string, Order>();
    const ref = collection(db, 'orders');
    const q = import.meta.env.VITE_FIRESTORE_ORDER_VISIBILITY_READY === 'true'
      ? query(ref, where('deletedByAdmin', '==', false))
      : query(ref);
    
    const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        if (disposed) return;
        invalidateRequests();
        // Firebase sends incremental changes after the initial snapshot.
        // Retain the full dataset needed by admin filters, but only decode
        // changed documents. The full-snapshot fallback supports older mocks.
        if (typeof querySnapshot.docChanges === 'function') {
          for (const change of querySnapshot.docChanges()) {
            const id = change.doc.id;
            if (change.type === 'removed') {
              byId.delete(id);
              continue;
            }
            const data = change.doc.data();
            if (data.deletedByAdmin) byId.delete(id);
            else byId.set(id, { ...data, id } as Order);
          }
        } else {
          byId.clear();
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.deletedByAdmin) byId.set(docSnap.id, { ...data, id: docSnap.id } as Order);
          });
        }
      setOrders(sortOrdersByCreatedAt(Array.from(byId.values()), 'desc'));
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
      byId.clear();
      invalidateRequests();
      unsubscribeSnapshot();
    };
  }, [adminToken, fetchOrders, invalidateRequests]);

  const handleUpdateOrderStatus = async (
    orderId: string,
    data: Partial<Order>,
    successMsg?: string,
    onSuccess?: (saved: { invoiceNo?: string }) => void
  ) => {
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
        onSuccess?.({ invoiceNo: typeof saved.invoiceNo === 'string' ? saved.invoiceNo : undefined });
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
    conflicts,
    loading,
    ordersError,
    isApproving,
    setIsApproving,
    fetchOrders,
    fetchConflicts,
    dismissConflict,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleBatchDelete,
    authHeaders
  };
}
