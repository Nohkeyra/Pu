import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Printer, FileText, Loader2, Eye, CheckCircle2, Calendar, MapPin, User, Clock, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type jsPDF from 'jspdf';
import type { Order } from '@/types';
import { generateInvoicePDF } from '@/services/pdfService';
import { numberToWords } from '@/services/numberToWordsBM';
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
  const [viewMode, setViewMode] = useState<'sheet' | 'pdf'>('sheet');

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
  const modalTitle = title || (language === 'bm' ? 'Pratonton Invois' : 'Invoice Preview');

  // Calculation helpers
  const totalAmount = order?.totalAmount || order?.quantity * (order?.prices?.['pack'] || 10.00) || 0;
  const dateObj = order?.dateTime ? new Date(order.dateTime) : (order?.date ? new Date(order.date) : new Date());
  const formattedDate = isNaN(dateObj.getTime()) ? format(new Date(), 'dd/MM/yyyy') : format(dateObj, 'dd/MM/yyyy');
  const qrData = `INVOICE: ${invoiceNo}\nDATE: ${formattedDate}\nTO: ${order?.to || '-'}\nTOTAL: RM ${totalAmount.toFixed(2)}`;

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
        className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl h-[92vh] bg-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 text-stone-100"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/90">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#A8E10C]/15 border border-[#A8E10C]/30 flex items-center justify-center text-[#A8E10C]">
                <FileText className="w-5 h-5" />
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

            {/* View switcher & Actions */}
            <div className="flex items-center gap-2">
              {/* Desktop/Web view toggle */}
              {!Capacitor.isNativePlatform() && (
                <div className="hidden sm:flex bg-stone-800 p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setViewMode('sheet')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'sheet'
                        ? 'bg-[#A8E10C] text-stone-950 font-bold shadow-sm'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {tText('Document', 'Dokumen')}
                  </button>
                  <button
                    onClick={() => setViewMode('pdf')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'pdf'
                        ? 'bg-[#A8E10C] text-stone-950 font-bold shadow-sm'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {tText('PDF Stream', 'Aliran PDF')}
                  </button>
                </div>
              )}

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

          {/* Modal Main Content Container */}
          <div className="flex-1 bg-stone-950/80 p-3 sm:p-6 overflow-y-auto custom-scrollbar relative">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-300">
                <Loader2 className="w-8 h-8 animate-spin text-[#A8E10C]" />
                <p className="text-xs font-medium">
                  {tText('Preparing invoice preview...', 'Menjana dokumen invois...')}
                </p>
              </div>
            ) : viewMode === 'pdf' && blobUrl ? (
              /* PDF iframe mode fallback for desktop browser */
              <div className="w-full h-full min-h-[500px] bg-stone-900 rounded-xl overflow-hidden border border-white/10">
                <iframe
                  src={`${blobUrl}#toolbar=0&navpanes=0`}
                  title={modalTitle}
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            ) : order ? (
              /* High Fidelity Interactive Document View */
              <div className="max-w-xl mx-auto bg-white text-stone-900 rounded-2xl shadow-2xl p-5 sm:p-8 border border-stone-200">
                {/* Header Logo & Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-stone-200">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold text-xl shrink-0">
                      RW
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-amber-800 uppercase tracking-tight leading-none">
                        RESTORAN WAWASAN
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 font-medium">
                        Unit 3, Level B3, Menara PjH
                      </p>
                      <p className="text-xs text-stone-500">
                        Jalan P2a, Presint 2, 62100 Putrajaya
                      </p>
                      <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                        Est. 1986 • Restoran Wawasan Pak Usop
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 w-full sm:w-auto">
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full uppercase tracking-wider mb-1.5">
                      INVOIS / INVOICE
                    </span>
                    <p className="text-xs text-stone-500">
                      {tText('No. Invois', 'Invoice No.')}:{' '}
                      <span className="font-bold text-stone-900 font-mono">{invoiceNo}</span>
                    </p>
                    <p className="text-xs text-stone-500">
                      {tText('Tarikh', 'Date')}:{' '}
                      <span className="font-bold text-stone-800">{formattedDate}</span>
                    </p>
                  </div>
                </div>

                {/* Recipient & Event Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      <span>{tText('Kepada / Bill To', 'Kepada / Bill To')}</span>
                    </div>
                    <p className="text-sm font-bold text-stone-900">{order.to}</p>
                    {order.attn && (
                      <p className="text-xs text-stone-600 mt-0.5">
                        <span className="font-semibold">Attn:</span> {order.attn}
                      </p>
                    )}
                    {order.phone && (
                      <p className="text-xs text-stone-500 font-mono mt-0.5">{order.phone}</p>
                    )}
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>{tText('Butiran Acara', 'Event Details')}</span>
                    </div>
                    {order.date && (
                      <p className="text-xs text-stone-800 font-medium">
                        <span className="text-stone-500">{tText('Tarikh Acara', 'Event Date')}:</span>{' '}
                        {order.date}
                      </p>
                    )}
                    {order.time && (
                      <p className="text-xs text-stone-800 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{order.time}</span>
                      </p>
                    )}
                    {order.location && (
                      <p className="text-xs text-stone-800 font-medium flex items-start gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{order.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Items & Pricing Table */}
                <div className="border border-stone-200 rounded-xl overflow-hidden mb-5">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-900 text-white font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3">{tText('Perkara / Description', 'Perkara / Description')}</th>
                        <th className="p-3 text-center">{tText('Pax / Qty', 'Pax / Qty')}</th>
                        <th className="p-3 text-right">{tText('Jumlah (RM)', 'Amount (RM)')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-800 font-medium">
                      <tr>
                        <td className="p-3 align-top">
                          <p className="font-bold text-stone-900 text-sm">
                            {tText('Tempahan Makanan Catering', 'Food Catering Order')}
                          </p>
                          <p className="text-stone-600 mt-1 leading-relaxed">
                            {order.menu || order.meals?.join(', ') || 'Pakej Makanan Citarasa Malaysia'}
                          </p>
                          {order.customMenu && (
                            <p className="text-stone-500 italic mt-1 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                              Note: {order.customMenu}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-center align-top font-semibold text-stone-900">
                          {order.quantity || '-'} PAX
                        </td>
                        <td className="p-3 text-right align-top font-bold text-stone-900 text-sm">
                          RM {totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total & Verification QR */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-4 bg-amber-50/80 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-amber-200 shadow-sm shrink-0">
                      <QRCodeSVG value={qrData} size={64} level="M" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                        <QrCode className="w-3.5 h-3.5 text-amber-700" />
                        <span>{tText('Kod Pengesahan', 'Verification Code')}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 max-w-[160px] leading-tight mt-0.5">
                        {tText(
                          'Imbas kod QR di atas untuk mengesahkan ketulenan invois rasmi ini.',
                          'Scan QR code above to verify authenticity of this official invoice.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                      {tText('Jumlah Keseluruhan', 'Grand Total')}
                    </p>
                    <p className="text-2xl font-black text-amber-950 font-display">
                      RM {totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Ringgit in Words Banner */}
                <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
                  <p className="text-[11px] text-stone-500 uppercase tracking-wider font-bold mb-0.5">
                    {tText('Ringgit dalam Perkataan / In Words', 'Ringgit in Words')}
                  </p>
                  <p className="text-xs font-bold text-stone-800 italic">
                    "{numberToWords(totalAmount, language)}"
                  </p>
                </div>

                {/* Status Badge */}
                <div className="mt-4 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {order.status === 'approved'
                        ? tText('Invois Diluluskan', 'Approved Invoice')
                        : tText('Invois Diterima', 'Order Submitted')}
                    </span>
                  </div>
                  <p className="font-mono text-stone-400">
                    Restoran Wawasan • Official Receipt
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-stone-400">
                <Eye className="w-12 h-12 mx-auto mb-3 text-stone-600" />
                <p className="text-sm font-medium">
                  {tText('Tiada maklumat invois untuk dipaparkan.', 'No order data available for preview.')}
                </p>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 bg-stone-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-stone-400 font-light text-center sm:text-left">
              {tText(
                'Sila semak butiran invois di atas. Klik butang untuk memuat turun salinan PDF rasmi.',
                'Review your invoice details above. Click the button below to download the official PDF copy.'
              )}
            </p>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500 cursor-pointer"
              >
                {tText('Close', 'Tutup')}
              </button>

              <button
                onClick={handleDownloadOrShare}
                disabled={downloading || (!activeDoc && !onDownload)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-stone-950 bg-[#A8E10C] hover:bg-[#A8E10C]/90 active:scale-[0.98] rounded-xl shadow-lg shadow-[#A8E10C]/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#A8E10C] disabled:opacity-50 cursor-pointer"
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
