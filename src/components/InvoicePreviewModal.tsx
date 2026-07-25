import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Capacitor } from '@capacitor/core';
import type { Order } from '@/types';
import { numberToWords } from '@/services/numberToWordsBM';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onDownload: () => void;
  language: 'en' | 'bm';
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  onDownload,
  language
}) => {
  const invoiceNo = order.invoiceNo || `INV-${order.id?.slice(0, 8).toUpperCase() || 'DRAFT'}`;
  
  // Use a fallback fixed date or order properties if available
  const dateStr = React.useMemo(() => {
    // If order has no date at all, we use a stable date for this render session
    // but usually an order SHOULD have a date.
    const fallbackDate = order.date || order.dateTime || new Date().toISOString();
    return order.date instanceof Date ? order.date : new Date(fallbackDate);
  }, [order.date, order.dateTime]);
  
  if (!isOpen) return null;
  
  // Use user's selected company or fallback to first
  const company = { name: 'RESTORAN WAWASAN', address: 'Unit 3, Level B3, Menara PjH, Putrajaya' };

  const totalAmount = order.totalAmount || order.quantity * (order.prices?.['pack'] || 10.00); // Default fallback

  const qrData = `INVOICE: ${invoiceNo}\nDATE: ${format(dateStr, 'dd/MM/yyyy')}\nTO: ${order.to}\nTOTAL: RM ${totalAmount.toFixed(2)}`;

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={language === 'bm' ? 'Pratonton Invois' : 'Invoice Preview'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">
              {language === 'bm' ? 'Pratonton Invois' : 'Invoice Preview'}
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  aria-label={language === 'bm' ? 'Tutup pratonton invois' : 'Close invoice preview'}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'bm' ? 'Tutup' : 'Close'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Invoice Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-100">
            {/* The Paper */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              {/* Header section */}
              <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-sm text-gray-500 whitespace-pre-line">{company.address}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 mb-1">INVOICE</div>
                  <p className="text-sm text-gray-600">No: <span className="font-semibold text-gray-900">{invoiceNo}</span></p>
                  <p className="text-sm text-gray-600">Date: <span className="font-semibold text-gray-900">{format(dateStr, 'dd/MM/yyyy')}</span></p>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {language === 'bm' ? 'Kepada:' : 'Bill To:'}
                </h3>
                <div className="text-sm text-gray-800">
                  <p className="font-semibold text-base">{order.to}</p>
                  {order.attn && <p>Attn: {order.attn}</p>}
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 font-medium">{language === 'bm' ? 'Perkara' : 'Description'}</th>
                    <th className="pb-2 font-medium text-right">{language === 'bm' ? 'Kuantiti' : 'Qty'}</th>
                    <th className="pb-2 font-medium text-right">{language === 'bm' ? 'Harga/Unit' : 'Unit Price'}</th>
                    <th className="pb-2 font-medium text-right">{language === 'bm' ? 'Jumlah' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 divide-y divide-gray-100">
                  <tr>
                    <td className="py-3">
                      <p className="font-medium">{language === 'bm' ? 'Tempahan Makanan' : 'Food Catering'}</p>
                      <p className="text-xs text-gray-500 mt-1">{order.menu || order.meals.join(', ')}</p>
                      {order.notes && <p className="text-xs text-gray-500 italic mt-1">Note: {order.notes}</p>}
                    </td>
                    <td className="py-3 text-right align-top">{order.quantity}</td>
                    <td className="py-3 text-right align-top">RM {(totalAmount / order.quantity).toFixed(2)}</td>
                    <td className="py-3 text-right align-top font-medium text-gray-900">RM {totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals & QR */}
              <div className="flex justify-between items-end pt-4 border-t border-gray-200">
                <div className="flex flex-col items-center">
                  <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm mb-2">
                    <QRCodeSVG value={qrData} size={80} level="M" />
                  </div>
                  <span className="text-[10px] text-gray-400 text-center uppercase tracking-wider">
                    {language === 'bm' ? 'Imbas Kod QR' : 'Scan to Verify'}
                  </span>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">
                    {language === 'bm' ? 'Jumlah Keseluruhan' : 'Grand Total'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    RM {totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                 <p className="text-xs text-gray-500 italic text-center">
                   {numberToWords(totalAmount, language)}
                 </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
            >
              {language === 'bm' ? 'Tutup' : 'Close'}
            </button>
            <button
              onClick={() => {
                onDownload();
                onClose();
              }}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {Capacitor.isNativePlatform() ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {language === 'bm'
                ? (Capacitor.isNativePlatform() ? 'Kongsi PDF' : 'Muat Turun PDF')
                : (Capacitor.isNativePlatform() ? 'Share PDF' : 'Download PDF')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
