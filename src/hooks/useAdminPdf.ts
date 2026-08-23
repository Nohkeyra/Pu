import { useState } from 'react';
import { generateInvoicePDF, preloadLogoForPDF } from '@/services/pdfService';
import { generateConsolidatedInvoicePDF } from '@/services/consolidatedInvoiceService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';
import type { Order } from '@/types';
import { getApiUrl } from '@/lib/api';
import type { ToastVariant } from '@/components/ui/Toast';

interface UseAdminPdfProps {
  t: (key: string) => string;
  language: string;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  authHeaders: () => HeadersInit;
}

export function useAdminPdf({ t, language, toast, authHeaders }: UseAdminPdfProps) {
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [isGeneratingConsolidated, setIsGeneratingConsolidated] = useState(false);
  const [consolidatedInvoiceNo, setConsolidatedInvoiceNo] = useState('');
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);

  const handlePreviewPDF = async (order: Order, isFinal: boolean) => {
    try {
      if (!order.id) throw new Error('Missing database ID');

      let pdfData = order;
      let invoiceNo = order.invoiceNo;
      
      if (!isFinal) {
        invoiceNo = `RW-${order.id.substring(0, 6).toUpperCase()}-PRE`;
        pdfData = { ...order, invoiceNo };
      }

      const pdfDoc = generateInvoicePDF(pdfData, isFinal, order.lang);
      const fileName = `${isFinal ? 'Invoice' : 'Preliminary'}_${invoiceNo}.pdf`;
      const pdfDataUri = pdfDoc.output('datauristring');

      setPreviewPdfUrl(pdfDataUri);
      setPreviewFileName(fileName);
      setIsPreviewOpen(true);

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdfDataUri.split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
      }
    } catch (error) {
      toast({ title: t('error'), description: String(error), variant: 'error' });
    }
  };

  const handleDownloadPDF = async (order: Order, isFinal: boolean) => {
    if (!order.id) return;
    setGeneratingInvoice(order.id);
    
    try {
      let pdfData = order;
      let invoiceNo = order.invoiceNo;
      if (!isFinal) {
        invoiceNo = `RW-${order.id.substring(0, 6).toUpperCase()}-PRE`;
        pdfData = { ...order, invoiceNo };
      }

      const pdfDoc = generateInvoicePDF(pdfData, isFinal, order.lang);
      const fileName = `${isFinal ? 'Invoice' : 'Preliminary'}_${invoiceNo}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdfDoc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({ title: fileName, url: savedFile.uri });
      } else {
        pdfDoc.save(fileName);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const prepareConsolidateModal = async () => {
    try {
      const res = await fetch(getApiUrl('/api/admin/next-invoice-number'), { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConsolidatedInvoiceNo(data.nextInvoiceNo || `RW-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        setConsolidatedInvoiceNo(`RW-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch {
      setConsolidatedInvoiceNo(`RW-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setShowConsolidateModal(true);
  };

  const handleGenerateConsolidatedInvoice = async (orders: Order[], withNotes: boolean, customInvoiceNo?: string) => {
    setShowConsolidateModal(false);
    setIsGeneratingConsolidated(true);

    try {
      await preloadLogoForPDF();
      const finalInvoiceNo = customInvoiceNo?.trim() || consolidatedInvoiceNo?.trim() || `RW-${Math.floor(1000 + Math.random() * 9000)}`;

      const pdfDoc = generateConsolidatedInvoicePDF(
        { orders, includeNotes: withNotes, invoiceNo: finalInvoiceNo, lang: language as 'bm' | 'en' },
        true
      );
      const fileName = `Invois_Konsolidasi_${finalInvoiceNo}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdfDoc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({ title: fileName, url: savedFile.uri });
      } else {
        pdfDoc.save(fileName);
      }

      toast({
        title: t('success'),
        description: `Consolidated invoice ${finalInvoiceNo} generated.`,
        variant: 'success'
      });
    } catch (error) {
      toast({ title: t('error'), description: String(error), variant: 'error' });
    } finally {
      setIsGeneratingConsolidated(false);
    }
  };

  return {
    generatingInvoice,
    isPreviewOpen,
    setIsPreviewOpen,
    previewPdfUrl,
    previewFileName,
    isGeneratingConsolidated,
    consolidatedInvoiceNo,
    setConsolidatedInvoiceNo,
    showConsolidateModal,
    setShowConsolidateModal,
    handlePreviewPDF,
    handleDownloadPDF,
    prepareConsolidateModal,
    handleGenerateConsolidatedInvoice
  };
}
