const fs = require('fs');

const code = `import { useState } from 'react';
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
      let invoiceNo = order.invoiceNo || \`RW \${order.id.substring(0, 5).toUpperCase()}-PRE\`;
      const fileName = \`\${isFinal ? 'Invoice' : 'Preliminary'}_\${invoiceNo}.pdf\`;

      const serverRes = await fetch(getApiUrl(\`/api/invoice/\${order.id}/pdf?final=\${isFinal}\`), {
        headers: authHeaders()
      });
      if (!serverRes.ok) throw new Error('Failed to generate PDF from server');
      
      const blob = await serverRes.blob();
      const pdfDataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

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
      let invoiceNo = order.invoiceNo || \`RW \${order.id.substring(0, 5).toUpperCase()}-PRE\`;
      const fileName = \`\${isFinal ? 'Invoice' : 'Preliminary'}_\${invoiceNo}.pdf\`;

      const serverRes = await fetch(getApiUrl(\`/api/invoice/\${order.id}/pdf?final=\${isFinal}\`), {
        headers: authHeaders()
      });
      if (!serverRes.ok) throw new Error('Failed to download PDF from server');
      const pdfBlob = await serverRes.blob();

      if (Capacitor.isNativePlatform()) {
        const pdfDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });
        const base64Data = pdfDataUri.split(',')[1];
        
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({ title: fileName, url: savedFile.uri });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(error);
      toast({ title: t('error'), description: String(error), variant: 'error' });
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const prepareConsolidateModal = async () => {
    try {
      const res = await fetch(getApiUrl('/api/admin/next-invoice-number'), { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConsolidatedInvoiceNo(data.nextInvoiceNo || \`RW \${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}\`);
      } else {
        setConsolidatedInvoiceNo(\`RW \${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}\`);
      }
    } catch {
      setConsolidatedInvoiceNo(\`RW \${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}\`);
    }
    setShowConsolidateModal(true);
  };

  const handleGenerateConsolidatedInvoice = async (orders: Order[], withNotes: boolean, customInvoiceNo?: string) => {
    setShowConsolidateModal(false);
    setIsGeneratingConsolidated(true);
    try {
      const desiredInvoiceNo = customInvoiceNo?.trim() || consolidatedInvoiceNo?.trim();
      const orderIds = orders.map((o) => o.id).filter(Boolean);
      
      let finalInvoiceNo = desiredInvoiceNo || \`RW \${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}\`;

      // 1. Commit the consolidated invoice number to Firestore
      try {
        const res = await fetch(getApiUrl('/api/admin/commit-consolidated-invoice'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          },
          body: JSON.stringify({ orderIds, invoiceNo: desiredInvoiceNo })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.invoiceNo) {
            finalInvoiceNo = data.invoiceNo;
          }
        }
      } catch (err) {
        console.warn('[Consolidated Invoice] Firestore commit fallback to local number:', err);
      }

      // 2. Fetch the PDF from the server
      const pdfRes = await fetch(getApiUrl('/api/admin/consolidated-invoice/pdf'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ orderIds, invoiceNo: finalInvoiceNo, includeNotes: withNotes, lang: language })
      });

      if (!pdfRes.ok) throw new Error('Failed to generate consolidated PDF from server');
      const pdfBlob = await pdfRes.blob();

      const fileName = \`Invois_Konsolidasi_\${finalInvoiceNo}_\${format(new Date(), 'yyyyMMdd_HHmm')}.pdf\`;

      if (Capacitor.isNativePlatform()) {
        const pdfDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });
        const base64Data = pdfDataUri.split(',')[1];
        
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({ title: fileName, url: savedFile.uri });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: t('success'),
        description: \`Consolidated invoice \${finalInvoiceNo} generated.\`,
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
`;
fs.writeFileSync('src/hooks/useAdminPdf.ts', code);
console.log("Rewrote useAdminPdf.ts");
