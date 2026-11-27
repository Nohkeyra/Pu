import { useEffect, useRef, useState } from 'react';
import type { Order } from '@/types';

import { getApiUrl } from '@/lib/api';
import { formatDateDisplay } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import type { ToastVariant } from '@/components/ui/Toast';

export interface SupportingPdfFile {
  id: string;
  filename: string;
  byteLength: number;
  contentBase64: string;
}

export interface InvoiceEmailPreview {
  id: string;
  email: string;
  subject: string;
  text: string;
  html: string;
  filename: string;
  invoiceNumbers: string[];
  expiresAt: number;
  submissionMode?: 'standard' | 'petronas_collector';
  companyCode?: string;
  totalBytes?: number;
  attachments?: Array<{ filename: string; byteLength: number }>;
}

const MAX_SUPPORTING_FILES = 10;
const MAX_COLLECTOR_TOTAL_BYTES = 20 * 1024 * 1024;

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
  const [submissionMode, setSubmissionMode] = useState<'standard' | 'petronas_collector'>(
    'standard'
  );
  const [collectorEligible, setCollectorEligible] = useState(false);
  const [supportingFiles, setSupportingFiles] = useState<SupportingPdfFile[]>([]);
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
  }, [
    recipientEmail,
    sendOrder,
    isSendDialogOpen,
    language,
    submissionMode,
    collectorEligible,
    supportingFiles,
  ]);
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

  const addSupportingFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const bm = language !== 'en';
    const nextFiles: SupportingPdfFile[] = [...supportingFiles];

    for (const file of incoming) {
      if (nextFiles.length >= MAX_SUPPORTING_FILES) {
        toast({
          title: t('error'),
          description: bm
            ? `Maksimum ${MAX_SUPPORTING_FILES} fail PDF sokongan dibenarkan.`
            : `At most ${MAX_SUPPORTING_FILES} supporting PDF files are allowed.`,
          variant: 'error',
        });
        break;
      }

      if (!/\.pdf$/i.test(file.name)) {
        toast({
          title: t('error'),
          description: bm
            ? `Hanya fail .pdf dibenarkan untuk mod pengumpul PETRONAS (${file.name}). Arkib ZIP tidak diterima.`
            : `Only .pdf attachments are supported in PETRONAS collector mode (${file.name}). ZIP archives are not allowed.`,
          variant: 'error',
        });
        continue;
      }

      try {
        const signature = await file.slice(0, 5).text();
        if (signature !== '%PDF-') {
          toast({
            title: t('error'),
            description: bm
              ? `Fail "${file.name}" bukan dokumen PDF yang sah.`
              : `File "${file.name}" is not a valid PDF document.`,
            variant: 'error',
          });
          continue;
        }

        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || '');
            resolve(raw.includes('base64,') ? raw.slice(raw.indexOf('base64,') + 7) : raw);
          };
          reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        const currentBytes = nextFiles.reduce((sum, item) => sum + item.byteLength, 0);
        if (currentBytes + file.size > MAX_COLLECTOR_TOTAL_BYTES) {
          toast({
            title: t('error'),
            description: bm
              ? 'Jumlah saiz lampiran PDF melebihi had 20 MB.'
              : 'Combined PDF attachment size exceeds the 20 MB limit.',
            variant: 'error',
          });
          continue;
        }

        nextFiles.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filename: file.name,
          byteLength: file.size,
          contentBase64,
        });
      } catch (err) {
        toast({ title: t('error'), description: String(err), variant: 'error' });
      }
    }

    setSupportingFiles(nextFiles);
  };

  const removeSupportingFile = (id: string) => {
    setSupportingFiles((prev) => prev.filter((item) => item.id !== id));
  };

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
            submissionMode,
            collectorEligible:
              submissionMode === 'petronas_collector' ? collectorEligible : undefined,
            supportingFiles:
              submissionMode === 'petronas_collector'
                ? supportingFiles.map(({ filename, contentBase64 }) => ({
                    filename,
                    contentBase64,
                  }))
                : undefined,
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
    setSubmissionMode('standard');
    setCollectorEligible(false);
    setSupportingFiles([]);
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
        window.open(url, '_blank', 'noopener,noreferrer');
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
    submissionMode,
    setSubmissionMode,
    collectorEligible,
    setCollectorEligible,
    supportingFiles,
    addSupportingFiles,
    removeSupportingFile,
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
