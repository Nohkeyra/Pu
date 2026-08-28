import { useState, useEffect, useRef } from 'react';
import type { Order } from '@/types';
import { getApiUrl } from '@/lib/api';
import { showConfirm } from '@/lib/nativeService';
import type { ToastVariant } from '@/components/ui/Toast';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

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

  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  });

  const fetchOrders = async (silent?: boolean) => {
    // Left for backwards compatibility with parts of the app that may call it directly.
    // Orders are kept live via the Firestore onSnapshot listener below, so this is
    // intentionally a no-op; the optional param exists only so callers (e.g. pull-to-refresh)
    // can pass a "silent" flag without a TypeScript signature mismatch.
    void silent;
  };

  const onLogoutRef = useRef(onLogout);
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    if (!adminToken) {
      setOrders([]);
      return;
    }

    setLoading(true);
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      
      unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
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
        console.error('Error fetching admin orders in real-time:', error);
        // If permission is denied even after Auth initialized, the custom token might be expired.
        // In that case, we should log out.
        if (error.code === 'permission-denied') {
          onLogoutRef.current?.();
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [adminToken]); // Removed onLogout to prevent infinite loops from inline functions

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
          toast({
            title: t('success'),
            description: successMsg,
            variant: 'success'
          });
        }
        return true;
      }
      throw new Error('Failed to update order');
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: t('error'),
        description: t('error_updating') || 'Failed to update order.',
        variant: 'error'
      });
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const isConfirmed = await showConfirm({
      title: t('confirm_action') || 'Confirm Action',
      message: t('delete_order_confirm') || 'Are you sure you want to delete this order?'
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
        toast({
          title: t('success'),
          description: t('order_deleted'),
          variant: 'success'
        });
      } else {
        throw new Error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: t('error'),
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
