import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Printer, FileText, Loader2, Eye } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type jsPDF from 'jspdf';
import type { Order } from '@/types';
import { generateInvoicePDF } from '@/services/pdfService';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  pdfDoc?: jsPDF | null;
  isFinal?: boolean;
  title?: string;
  filename?: string;
  language?: 'en' | 'bm';
  onDownload?: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  pdfDoc,
  isFinal = false,
  title,
  filename,
  language = 'bm',
  onDownload
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<jsPDF | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  useEffect(() => {
    let currentUrl: string | null = null;

    if (isOpen && (order || pdfDoc)) {
      setIsGenerating(true);
      try {
        let docToUse: jsPDF;
        if (pdfDoc) {
          docToUse = pdfDoc;
        } else if (order) {
          const pdfData = {
            ...order,
            dateTime: order.dateTime || (order.date ? new Date(order.date).toISOString() : new Date().toISOString()),
          };
          docToUse = generateInvoicePDF(pdfData as Order, isFinal, language);
        } else {
          return;
        }

        setActiveDoc(docToUse);
        const pdfBlob = docToUse.output('blob');
        currentUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(currentUrl);
      } catch (err) {
        console.error('Error generating PDF preview blob:', err);
      } finally {
        setIsGenerating(false);
      }
    } else {
      setBlobUrl(null);
      setActiveDoc(null);
    }

    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [isOpen, order, pdfDoc, isFinal, language]);

  if (!isOpen) return null;

  const invoiceNo = order?.invoiceNo || `INV-${order?.id?.slice(0, 8).toUpperCase() || 'DRAFT'}`;
  const defaultFilename = filename || `Invois_Wawasan_${invoiceNo}.pdf`;
  const modalTitle = title || (language === 'bm' ? 'Pratonton Invois PDF' : 'PDF Invoice Preview');

  const handleDownloadOrShare = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!activeDoc) return;

    setDownloading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const base64Data = activeDoc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: defaultFilename,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({
          title: defaultFilename,
          url: savedFile.uri,
        });
      } else {
        activeDoc.save(defaultFilename);
      }
    } catch (err) {
      console.error('Error downloading/sharing PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl h-[90vh] bg-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-stone-950/80 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A8E10C]/15 border border-[#A8E10C]/30 flex items-center justify-center text-[#A8E10C]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight font-display">
                  {modalTitle}
                </h2>
                <p className="text-[11px] text-stone-400 font-mono">
                  {defaultFilename}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!Capacitor.isNativePlatform() && blobUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handlePrint}
                      aria-label={tText('Cetak PDF', 'Print PDF')}
                      className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#A8E10C]"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tText('Print', 'Cetak')}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onClose}
                    aria-label={tText('Tutup pratonton', 'Close preview')}
                    className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#A8E10C]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tText('Close', 'Tutup')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* PDF Viewer Body */}
          <div className="flex-1 bg-stone-900/90 p-2 sm:p-4 relative flex items-center justify-center overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center gap-3 text-stone-300">
                <Loader2 className="w-8 h-8 animate-spin text-[#A8E10C]" />
                <p className="text-xs font-medium">
                  {tText('Generating PDF preview...', 'Penjana pratonton PDF sedang berjalan...')}
                </p>
              </div>
            ) : blobUrl ? (
              <div className="w-full h-full bg-stone-950 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                <iframe
                  src={`${blobUrl}#toolbar=0&navpanes=0`}
                  title={modalTitle}
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            ) : (
              <div className="text-center p-6 text-stone-400">
                <Eye className="w-10 h-10 mx-auto mb-2 text-stone-600" />
                <p className="text-sm font-medium">
                  {tText('Unable to render PDF preview.', 'Gagal memaparkan pratonton PDF.')}
                </p>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 bg-stone-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-stone-400 font-light text-center sm:text-left">
              {tText(
                'Review your generated invoice above before saving or printing.',
                'Sila semak butiran invois jana semula di atas sebelum memuat turun.'
              )}
            </p>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500"
              >
                {tText('Close', 'Tutup')}
              </button>

              <button
                onClick={handleDownloadOrShare}
                disabled={downloading || !activeDoc}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-stone-950 bg-[#A8E10C] hover:bg-[#A8E10C]/90 rounded-xl shadow-lg shadow-[#A8E10C]/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#A8E10C] disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : Capacitor.isNativePlatform() ? (
                  <Share2 className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  {Capacitor.isNativePlatform()
                    ? tText('Share PDF', 'Kongsi PDF')
                    : tText('Download PDF', 'Muat Turun PDF')}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PDFPreviewModal;
