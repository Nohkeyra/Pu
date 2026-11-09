import { useEffect, useRef, useState } from 'react';
import type { Order } from '@/types';

import { getApiUrl } from '@/lib/api';
import { formatDateDisplay } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import type { ToastVariant } from '@/components/ui/Toast';

export interface InvoiceEmailPreview {
  id: string;
  email: string;
  subject: string;
  text: string;
  html: string;
  filename: string;
  invoiceNumbers: string[];
  expiresAt: number;
}
interface UseAdminMessagingProps {
  t: (key: string) => string;
  toast: (opts: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => void;
  authHeaders: () => HeadersInit;
  getDisplayInvoiceNo: (order: Order) => string;
  language?: string;
}

export function useAdminMessaging({
  t,
  toast,
  authHeaders,
  getDisplayInvoiceNo,
  language,
}: UseAdminMessagingProps) {
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendOrder, setSendOrder] = useState<Order | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false),
    [emailPreview, setEmailPreview] = useState<InvoiceEmailPreview | null>(null),
    [emailPdfUrl, setEmailPdfUrl] = useState(''),
    [preparingEmail, setPreparingEmail] = useState(false);
  const requestId = useRef(0),
    sendLock = useRef(false);
  useEffect(() => {
    requestId.current++;
    setEmailPreview(null);
    setEmailPdfUrl('');
    setPreparingEmail(false);
  }, [recipientEmail, sendOrder, isSendDialogOpen, language]);
  useEffect(
    () => () => {
      requestId.current++;
    },
    []
  );
  useEffect(
    () => () => {
      if (emailPdfUrl) URL.revokeObjectURL(emailPdfUrl);
    },
    [emailPdfUrl]
  );
  const prepareEmailPreview = async () => {
    if (!sendOrder) return;
    const current = ++requestId.current;
    setPreparingEmail(true);
    setEmailPreview(null);
    setEmailPdfUrl('');
    try {
      const response = await fetch(getApiUrl('/api/admin/invoice-email-preview'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            orderId: sendOrder.id,
            batchNo: sendOrder.invoiceBatchNo,
            email: recipientEmail,
            lang: language,
          }),
        }),
        data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Unable to prepare email preview.');
      const pdfResponse = await fetch(
        getApiUrl(`/api/admin/invoice-email-preview/${data.preview.id}/pdf`),
        { headers: authHeaders() }
      );
      if (!pdfResponse.ok) throw new Error('Unable to load PDF attachment.');
      const blob = await pdfResponse.blob();
      if (current !== requestId.current) return;
      setEmailPdfUrl(URL.createObjectURL(blob));
      setEmailPreview(data.preview);
    } catch (error) {
      if (current === requestId.current)
        toast({ title: t('error'), description: String(error), variant: 'error' });
    } finally {
      if (current === requestId.current) setPreparingEmail(false);
    }
  };

  const openSendDialog = (order: Order) => {
    setSendOrder(order);
    setRecipientEmail(order.email || '');
    setRecipientPhone(order.contact || '');
    setIsSendDialogOpen(true);
  };

  const openEmailAttachment = async () => {
    if (!emailPdfUrl || !emailPreview || !Capacitor.isNativePlatform()) return;
    try {
      const blob = await (await fetch(emailPdfUrl)).blob();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ]);
      const file = await Filesystem.writeFile({
        path: emailPreview.filename,
        data,
        directory: Directory.Cache,
      });
      await Share.share({ title: emailPreview.filename, url: file.uri });
    } catch (error) {
      toast({ title: t('error'), description: String(error), variant: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!sendOrder || !emailPreview || !emailPdfUrl || sendLock.current) return;
    if (
      emailPreview.email !== recipientEmail.trim().toLowerCase() ||
      emailPreview.expiresAt < Date.now()
    ) {
      setEmailPreview(null);
      toast({
        title: t('error'),
        description: 'Sediakan pratonton semula / Refresh the preview.',
        variant: 'error',
      });
      return;
    }
    sendLock.current = true;
    setSendingEmail(true);
    try {
      const response = await fetch(getApiUrl('/api/send-invoice'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ previewId: emailPreview.id }),
        }),
        data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to queue email.');
      toast({
        title: language === 'en' ? 'Email queued' : 'Emel dalam giliran',
        description:
          language === 'en'
            ? 'The mail server delivery result is recorded separately.'
            : 'Keputusan penghantaran pelayan emel direkodkan secara berasingan.',
        variant: 'success',
        duration: 5000,
      });
      setIsSendDialogOpen(false);
    } catch (error) {
      toast({ title: t('sending_failed'), description: String(error), variant: 'error' });
    } finally {
      sendLock.current = false;
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!sendOrder) return;

    try {
      const invoiceNo = getDisplayInvoiceNo(sendOrder);
      const total = sendOrder.totalAmount || 0;
      const formattedPhone = recipientPhone.replace(/\D/g, '').replace(/^0/, '60');
      const eventDateDisplay = formatDateDisplay(
        sendOrder.dateTime || sendOrder.eventDate || sendOrder.date
      );

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
          lang: sendOrder.lang,
        }),
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
    emailPreview,
    emailPdfUrl,
    preparingEmail,
    prepareEmailPreview,
    openEmailAttachment,
    openSendDialog,
    handleSendEmail,
    handleSendWhatsApp,
  };
}
