import { useState } from 'react';
import type { Order } from '@/types';

import { getApiUrl } from '@/lib/api';
import { formatDateDisplay } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import type { ToastVariant } from '@/components/ui/Toast';

interface UseAdminMessagingProps {
  t: (key: string) => string;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
  authHeaders: () => HeadersInit;
  getDisplayInvoiceNo: (order: Order) => string;
  language?: string;
}

export function useAdminMessaging({ t, toast, authHeaders, getDisplayInvoiceNo }: UseAdminMessagingProps) {
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendOrder, setSendOrder] = useState<Order | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const openSendDialog = (order: Order) => {
    setSendOrder(order);
    setRecipientEmail(order.email || '');
    setRecipientPhone(order.contact || '');
    setIsSendDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!sendOrder) return;
    setSendingEmail(true);

    try {
      const invoiceNo = getDisplayInvoiceNo(sendOrder);


      const response = await fetch(getApiUrl('/api/send-invoice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          orderId: sendOrder.id,
          email: recipientEmail,
          name: sendOrder.name,
          invoiceNo,
          isFinal: true,
          lang: sendOrder.lang
        })
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast({
        title: t('invoice_emailed'),
        description: t('invoice_emailed_desc').replace('{email}', recipientEmail),
        variant: 'success',
        duration: 4000
      });
      setIsSendDialogOpen(false);
    } catch (err) {
      toast({ title: t('sending_failed'), description: String(err), variant: 'error' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!sendOrder) return;

    try {
      const invoiceNo = getDisplayInvoiceNo(sendOrder);
      const total = sendOrder.totalAmount || 0;
      const formattedPhone = recipientPhone.replace(/\D/g, '').replace(/^0/, '60');
      const eventDateDisplay = formatDateDisplay(sendOrder.dateTime || sendOrder.eventDate || sendOrder.date);
      
      const response = await fetch(getApiUrl('/api/send-invoice-whatsapp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          recipientPhone: formattedPhone,
          customerName: sendOrder.name,
          invoiceNo,
          eventDate: eventDateDisplay,
          pax: sendOrder.quantity || '-',
          totalAmount: total,
          lang: sendOrder.lang
        })
      });

      if (!response.ok) throw new Error('Failed to generate WhatsApp link from server');
      const data = await response.json();
      const url = data.whatsappUrl;

      if (Capacitor.isNativePlatform()) {
        window.location.assign(url);
      } else {
        window.open(url, '_blank');
      }

      toast({ title: t('whatsapp_opened'), variant: 'success' });
      setIsSendDialogOpen(false);
    } catch (err) {
      toast({ title: t('sending_failed'), description: String(err), variant: 'error' });
    }
  };

  return {
    isSendDialogOpen,
    setIsSendDialogOpen,
    sendOrder,
    recipientEmail,
    setRecipientEmail,
    recipientPhone,
    setRecipientPhone,
    sendingEmail,
    openSendDialog,
    handleSendEmail,
    handleSendWhatsApp
  };
}
