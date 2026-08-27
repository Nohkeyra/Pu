import { useState } from 'react';
import type { Order } from '@/types';
import { generateInvoicePDF } from '@/services/pdfService';
import { getApiUrl } from '@/lib/api';
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
      const pdfDoc = generateInvoicePDF(sendOrder, sendOrder.status === 'approved', sendOrder.lang);
      const pdfBase64 = pdfDoc.output('datauristring');

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
          pdfBase64,
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

  const handleSendWhatsApp = () => {
    if (!sendOrder) return;

    const invoiceNo = getDisplayInvoiceNo(sendOrder);
    const total = sendOrder.totalAmount || 0;
    const formattedPhone = recipientPhone.replace(/\D/g, '').replace(/^0/, '60');
    const isBm = sendOrder.lang !== 'en';
    
    const msg = isBm 
      ? `Salam ${sendOrder.name},\n\nTerima kasih kerana memilih *Restoran Wawasan Pak Usop*.\n\n` +
        `Berikut adalah butiran invois tempahan katering anda:\n` +
        `• *No. Invois:* ${invoiceNo}\n` +
        `• *Tarikh Majlis:* ${sendOrder.date}\n` +
        `• *Bilangan Pax:* ${sendOrder.quantity || '-'} orang\n` +
        `• *Jumlah Bayaran:* RM ${total.toFixed(2)}\n\n` +
        `*Maklumat Pembayaran (Bank Transfer):*\n` +
        `• Bank: *Bank Muamalat*\n` +
        `• Nama Akaun: *RESTORAN WAWASAN*\n` +
        `• No. Akaun: *16010000-405710*\n\n` +
        `Sila hantarkan resit bayaran di sini setelah pembayaran dibuat. Sekiranya ada sebarang pertanyaan, sila hubungi kami di talian *017-3157731*.\n\n` +
        `Terima kasih!`
      : `Hello ${sendOrder.name},\n\nThank you for choosing *Restoran Wawasan Pak Usop*.\n\n` +
        `Here are your catering invoice details:\n` +
        `• *Invoice No:* ${invoiceNo}\n` +
        `• *Event Date:* ${sendOrder.date}\n` +
        `• *Guest Count:* ${sendOrder.quantity || '-'} pax\n` +
        `• *Total Amount:* RM ${total.toFixed(2)}\n\n` +
        `*Bank Payment Details:*\n` +
        `• Bank: *Bank Muamalat*\n` +
        `• Account Name: *RESTORAN WAWASAN*\n` +
        `• Account No: *16010000-405710*\n\n` +
        `Please share your payment transfer receipt once completed. For any inquiries, feel free to reach us at *017-3157731*.\n\n` +
        `Thank you!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    
    if (Capacitor.isNativePlatform()) {
      window.location.assign(url);
    } else {
      window.open(url, '_blank');
    }

    toast({ title: t('whatsapp_opened'), variant: 'success' });
    setIsSendDialogOpen(false);
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
