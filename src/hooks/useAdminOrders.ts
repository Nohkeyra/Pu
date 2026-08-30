import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order } from '@/types';
import { getApiUrl } from '@/lib/api';
import { showConfirm } from '@/lib/nativeService';
import type { ToastVariant } from '@/components/ui/Toast';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface UseAdminOrdersProps {
  adminToken?: string;
  onLogout?: () => void;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
  t: (key: string) => string;
  language?: string;
}

export function useAdminOrders({ adminToken, onLogout, toast, t }: UseAdminOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

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
    if (!silent) setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'fetch', pageSize: 100 })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      } else if (response.status === 401 || response.status === 403) {
        onLogoutRef.current?.();
      }
    } catch (err) {
      console.error('Error fetching admin orders via API:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [adminToken, authHeaders]);

  useEffect(() => {
    if (!adminToken) {
      setOrders([]);
      return;
    }

    // Always fetch initial order data via Admin API using JWT authorization
    fetchOrders(false);

    // Optional real-time listener if Firestore rules allow; falls back silently to API mode on permission check failure
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.deletedByAdmin) {
          return;
        }
        let createdAtObj = data.createdAt;
        if (data.createdAt) {
          const sec = typeof data.createdAt.seconds === 'number'
            ? data.createdAt.seconds
            : (typeof data.createdAt._seconds === 'number' ? data.createdAt._seconds : null);
          const nanosec = typeof data.createdAt.nanoseconds === 'number'
            ? data.createdAt.nanoseconds
            : (typeof data.createdAt._nanoseconds === 'number' ? data.createdAt._nanoseconds : 0);
              
          if (sec !== null) {
            createdAtObj = { seconds: sec, nanoseconds: nanosec };
          }
        }
        
        fetchedOrders.push({ 
          id: docSnap.id, 
          ...data,
          createdAt: createdAtObj 
        } as Order);
      });
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.warn('[Admin Orders] Real-time Firestore snapshot inactive (decoupled admin mode, using Admin API):', error.message);
      setLoading(false);
    });

    return () => {
      unsubscribeSnapshot();
    };
  }, [adminToken, fetchOrders]);

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
        if (successMsg) {
          toastRef.current({
            title: tRef.current('success'),
            description: successMsg,
            variant: 'success'
          });
        }
        return true;
      }
      throw new Error('Failed to update order');
    } catch (error) {
      console.error('Error updating order:', error);
      toastRef.current({
        title: tRef.current('error'),
        description: tRef.current('error_updating') || 'Failed to update order.',
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
        toastRef.current({
          title: tRef.current('success'),
          description: tRef.current('order_deleted'),
          variant: 'success'
        });
      } else {
        throw new Error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toastRef.current({
        title: tRef.current('error'),
        description: 'Failed to delete order.',
        variant: 'error'
      });
    }
  };

  return {
    orders,
    loading,
    isApproving,
    setIsApproving,
    fetchOrders,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    authHeaders
  };
}
