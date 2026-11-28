import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Printer,
  RotateCw,
  Share2,
  X,
} from 'lucide-react';
import type { Order } from '@/types';
import { auth } from '@/firebaseConfig';
import { getApiUrl } from '@/lib/api';
import { formatDateDisplay, getDisplayInvoiceNo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { NotificationType, triggerLightImpact, triggerNotification } from '@/lib/haptics';
import { launchWhatsApp } from '@/lib/nativeService';
import { RESTORAN_CONTACT } from '@/constants/contact';
import { useOverlayAccessibility } from '@/hooks/ui/useOverlayAccessibility';

const AdminPdfCanvasPreview = lazy(() => import('@/components/admin/AdminPdfCanvasPreview'));

export interface CustomerInvoicePreviewModalProps {
  isOpen: boolean;
  onClose?: () => void;
  order?: Order;
  onDownload?: () => void;
  language?: 'en' | 'bm';
  isFinal?: boolean;
  docType?: 'invoice' | 'quotation';
}

export function CustomerInvoicePreviewModal({
  isOpen,
  onClose,
  order,
  onDownload,
  language = 'bm',
  isFinal = false,
  docType,
}: CustomerInvoicePreviewModalProps) {
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const reduceMotion = Boolean(useReducedMotion());
  const modalRef = useRef<HTMLDivElement>(null);

  useOverlayAccessibility({
    isOpen,
    onClose: () => onClose?.(),
    containerRef: modalRef,
  });

  const orderStatusLower = (order?.status || '').toLowerCase();
  const isOrderFinal =
    isFinal ||
    docType === 'invoice' ||
    ['approved', 'billed', 'in_transit', 'delivered', 'completed'].includes(orderStatusLower);

  const effectiveDocType = docType || (isOrderFinal ? 'invoice' : 'quotation');
  const invoiceNo =
    (order ? getDisplayInvoiceNo(order) : '') ||
    order?.invoiceNo ||
    order?.officialInvoiceNo ||
    order?.quoteNo ||
    order?.orderId ||
    'RW PREVIEW';
  const safeFileName = `${
    effectiveDocType === 'quotation' ? 'Quotation' : 'Invoice'
  }_${String(invoiceNo).replace(/[\\/:*?"<>|]/g, '_')}.pdf`;

  useEffect(() => {
    if (!isOpen) return;
    triggerLightImpact();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !order?.id) {
      setBlobUrl(null);
      setPdfBlob(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    const controller = new AbortController();

    const loadPdf = async () => {
      setStatus('loading');
      setErrorMessage('');
      setPdfBlob(null);
      setBlobUrl(null);

      try {
        const idToken = auth.currentUser
          ? await auth.currentUser.getIdToken().catch(() => null)
          : null;
        if (cancelled) return;

        const params = new URLSearchParams({
          final: String(isOrderFinal),
          lang: language,
        });
        if (docType) params.set('docType', docType);

        const res = await fetch(
          getApiUrl(`/api/invoice/${encodeURIComponent(order.id!)}/pdf?${params.toString()}`),
          {
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setBlobUrl(createdUrl);
        setStatus('ready');
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return;
        console.error('[CustomerInvoicePreviewModal] PDF fetch failed:', err);
        setErrorMessage(
          language === 'bm'
            ? 'Dokumen PDF tidak dapat dimuatkan buat masa ini.'
            : 'Unable to load the PDF document right now.'
        );
        setStatus('error');
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      controller.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, order?.id, isOrderFinal, language, docType, reloadNonce]);

  const handleCopyInvoiceNo = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(invoiceNo);
      setCopiedInvoiceNo(true);
      triggerLightImpact();
      setTimeout(() => setCopiedInvoiceNo(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }, [invoiceNo]);

  const handleDownloadPdf = useCallback(async () => {
    triggerLightImpact();
    if (onDownload) {
      onDownload();
      onClose?.();
      return;
    }

    if (!pdfBlob && !blobUrl) return;
    try {
      let blobToSave = pdfBlob;
      if (!blobToSave && blobUrl) {
        const resp = await fetch(blobUrl);
        blobToSave = await resp.blob();
      }
      if (!blobToSave) return;

      if (Capacitor.isNativePlatform()) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
            else reject(new Error('Failed to encode PDF'));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blobToSave);
        });
        const savedFile = await Filesystem.writeFile({
          path: safeFileName,
          data: base64Data,
          directory: Directory.Cache,
        });
        await Share.share({ title: safeFileName, url: savedFile.uri });
      } else {
        const downloadUrl = blobUrl || URL.createObjectURL(blobToSave);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (!blobUrl) URL.revokeObjectURL(downloadUrl);
      }
      triggerNotification(NotificationType.Success);
    } catch (err) {
      console.error('[CustomerInvoicePreviewModal] Download failed:', err);
    }
  }, [onDownload, onClose, pdfBlob, blobUrl, safeFileName]);

  const handlePrint = useCallback(() => {
    triggerLightImpact();
    if (!blobUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    const cleanup = () => {
      setTimeout(() => {
        iframe.remove();
      }, 60_000);
    };
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('[CustomerInvoicePreviewModal] Print failed:', err);
      } finally {
        cleanup();
      }
    };
    document.body.appendChild(iframe);
  }, [blobUrl]);

  const handleWhatsAppShare = useCallback(() => {
    triggerLightImpact();
    const dateStr = formatDateDisplay(
      order?.eventDate || order?.dateTime || order?.date || new Date()
    );
    const customerName = order?.name || order?.to || 'Pelanggan';
    const qty = order?.quantity || order?.guests || 1;
    const totalAmount = Number(order?.totalAmount || 0);
    const msg =
      language === 'bm'
        ? `Salam Sejahtera Restoran Wawasan,\n\nSaya ingin merujuk dokumen katering saya:\nNo. Rujukan: *${invoiceNo}*\nNama: *${customerName}*\nTarikh Majlis: *${dateStr}*\nKuantiti: *${qty} Pax*${isOrderFinal && totalAmount > 0 ? `\nJumlah: *RM ${totalAmount.toFixed(2)}*` : ''}\n\nMohon semakan dan maklum balas lanjut. Terima kasih!`
        : `Hello Restoran Wawasan,\n\nI would like to refer to my catering document:\nReference No: *${invoiceNo}*\nName: *${customerName}*\nEvent Date: *${dateStr}*\nQuantity: *${qty} Pax*${isOrderFinal && totalAmount > 0 ? `\nTotal: *RM ${totalAmount.toFixed(2)}*` : ''}\n\nThank you!`;

    launchWhatsApp({
      phone: RESTORAN_CONTACT.whatsappRaw,
      message: msg,
    });
  }, [order, invoiceNo, language, isOrderFinal]);

  if (!isOpen) return null;

  const badgeTitle =
    effectiveDocType === 'quotation'
      ? language === 'bm'
        ? 'Sebut Harga Rasmi'
        : 'Official Quotation'
      : language === 'bm'
        ? 'Invois Rasmi'
        : 'Official Invoice';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={badgeTitle}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-6"
      onClick={() => onClose?.()}
    >
      <motion.div
        ref={modalRef}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[90vh] max-h-[860px] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col"
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/95 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                isOrderFinal
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50'
              }`}
            >
              {isOrderFinal ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{badgeTitle}</span>
            </span>

            <div className="flex items-center gap-1 text-xs sm:text-sm font-mono font-bold text-stone-700 dark:text-stone-200">
              <span className="truncate">{invoiceNo}</span>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleCopyInvoiceNo}
                aria-label={language === 'bm' ? 'Salin nombor rujukan' : 'Copy reference number'}
                className="h-7 w-7 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
              >
                {copiedInvoiceNo ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => onClose?.()}
            aria-label={language === 'bm' ? 'Tutup paparan' : 'Close preview'}
            className="min-h-[44px] min-w-[44px] rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* True PDF Preview Viewport */}
        <div className="flex-1 min-h-0 bg-stone-100 dark:bg-stone-950 relative">
          {status === 'loading' || status === 'idle' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-stone-600 dark:text-stone-300">
              <WawasanLoader size={56} />
              <span>
                {language === 'bm' ? 'Memuatkan dokumen PDF…' : 'Loading official PDF document…'}
              </span>
            </div>
          ) : status === 'error' || !blobUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
              <p className="text-sm text-stone-600 dark:text-stone-300 max-w-md">
                {errorMessage ||
                  (language === 'bm'
                    ? 'Pratonton PDF tidak dapat dibuka.'
                    : 'PDF preview could not be opened.')}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReloadNonce((n) => n + 1)}
                className="gap-2 rounded-xl"
              >
                <RotateCw className="w-4 h-4" />
                <span>{language === 'bm' ? 'Cuba Lagi' : 'Retry'}</span>
              </Button>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-stone-600 dark:text-stone-300">
                  <WawasanLoader size={56} />
                  <span>{language === 'bm' ? 'Memaparkan PDF…' : 'Rendering PDF…'}</span>
                </div>
              }
            >
              <AdminPdfCanvasPreview pdfUrl={blobUrl} language={language} />
            </Suspense>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {!Capacitor.isNativePlatform() && (
              <Button
                variant="outline"
                type="button"
                disabled={!blobUrl}
                onClick={handlePrint}
                className="inline-flex min-h-[44px] h-auto items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bm' ? 'Cetak' : 'Print'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex min-h-[44px] h-auto items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'bm' ? 'WhatsApp' : 'WhatsApp Share'}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={!onDownload && !pdfBlob}
              onClick={handleDownloadPdf}
              className="inline-flex min-h-[44px] h-auto items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}</span>
            </Button>

            <Button
              variant="ghost"
              type="button"
              onClick={() => onClose?.()}
              className="min-h-[44px] h-auto px-4 py-2 rounded-xl text-xs font-semibold"
            >
              {language === 'bm' ? 'Tutup' : 'Close'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
