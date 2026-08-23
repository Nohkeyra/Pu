import { useState, useEffect } from 'react';
import type { Order } from '@/types';
import { getApiUrl } from '@/lib/api';
import { showConfirm } from '@/lib/nativeService';
import type { ToastVariant } from '@/components/ui/Toast';

interface SerializedOrder extends Omit<Order, 'createdAt'> {
  createdAt: { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number } | null;
}

interface UseAdminOrdersProps {
  adminToken?: string;
  onLogout?: () => void;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
  t: (key: string) => string;
}

export function useAdminOrders({ adminToken, onLogout, toast, t }: UseAdminOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  });

  const fetchOrders = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'fetch', pageSize: 50 })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const formattedOrders = result.orders.map((order: SerializedOrder) => {
            let createdAtObj = order.createdAt;
            if (order.createdAt) {
              const sec = typeof order.createdAt.seconds === 'number'
                ? order.createdAt.seconds
                : (typeof order.createdAt._seconds === 'number' ? order.createdAt._seconds : null);
              const nanosec = typeof order.createdAt.nanoseconds === 'number'
                ? order.createdAt.nanoseconds
                : (typeof order.createdAt._nanoseconds === 'number' ? order.createdAt._nanoseconds : 0);
              
              if (sec !== null) {
                createdAtObj = {
                  seconds: sec,
                  nanoseconds: nanosec,
                };
              }
            }
            return {
              ...order,
              createdAt: createdAtObj,
            };
          });
          
          setOrders(formattedOrders);
        }
      } else if (response.status === 401) {
        onLogout?.();
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

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
        fetchOrders(true);
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
        fetchOrders(true);
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
