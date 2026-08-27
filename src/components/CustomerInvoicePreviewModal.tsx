import type { Order } from '@/types';
import { getAssetUrl } from '@/lib/utils';
import { Download, X, CheckCircle, Clock } from 'lucide-react';

export interface CustomerInvoicePreviewModalProps {
  isOpen: boolean; 
  onClose?: () => void;
  order?: Order;
  onDownload?: () => void;
  language?: 'en' | 'bm';
  isFinal?: boolean;
}

export function CustomerInvoicePreviewModal({ 
  isOpen, 
  onClose, 
  order, 
  onDownload, 
  language = 'bm',
  isFinal = false 
}: CustomerInvoicePreviewModalProps) {
  if (!isOpen) return null;

  const invoiceNo = order?.invoiceNo || order?.officialInvoiceNo || order?.orderId || `RW-PREVIEW`;
  const dateStr = order?.date 
    ? (typeof order.date === 'string' ? order.date : new Date(order.date).toLocaleDateString())
    : new Date().toLocaleDateString();

  const totalAmount = order?.totalAmount || (order?.quantity ? order.quantity * 15 : 150);

  const isOrderFinal = isFinal || ['approved', 'billed', 'in_transit', 'delivered'].includes(order?.status?.toLowerCase() || '');
  
  const mealCount = order?.meals?.length || 1;
  const qty = order?.quantity || order?.guests || 1;
  const minPricePerPax = 12;
  const maxPricePerPax = 22;
  const minTotal = qty * minPricePerPax * mealCount;
  const maxTotal = qty * maxPricePerPax * mealCount;
  
  const priceRangeStr = `RM ${minPricePerPax.toFixed(2)} - RM ${maxPricePerPax.toFixed(2)}`;
  const totalRangeStr = `RM ${minTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} - RM ${maxTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={language === 'bm' ? 'Pratonton Invois PDF' : 'PDF Invoice Preview'}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300">
              {isOrderFinal ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-orange-600 dark:text-orange-400" />
                  {language === 'bm' ? 'Invois Rasmi' : 'Official Invoice'}
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                  {language === 'bm' ? 'Invois Awal / Sebut Harga' : 'Preliminary Invoice / Quote'}
                </>
              )}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Invoice Paper Preview */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-stone-200 dark:border-stone-700 gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={getAssetUrl('/assets/brand/wawasan_logo.svg')} 
                alt="Restoran Wawasan" 
                className="w-14 h-14 object-contain rounded-lg bg-orange-50/80 p-1 border border-orange-200"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('.png')) {
                    target.src = getAssetUrl('/assets/brand/wawasan_logo.png');
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                  RESTORAN WAWASAN
                </h1>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                  Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya
                </p>
                <p className="microcopy-12 text-stone-500 dark:text-stone-500">
                  Tel: 017-858 2642 • WA: 017-315 7721 • Email: wawasan.orders@gmail.com
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right bg-stone-100 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700 w-full sm:w-auto">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                {language === 'bm' ? 'No. Invois' : 'Invoice No.'}
              </div>
              <div className="text-base font-mono font-bold text-orange-600 dark:text-orange-400">
                {invoiceNo}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {language === 'bm' ? 'Tarikh' : 'Date'}: {dateStr}
              </div>
            </div>
          </div>

          {/* Client & Booking Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                {language === 'bm' ? 'Kepada (Invois Kepada)' : 'Invoiced To'}
              </h3>
              <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                {order?.to || order?.name || 'Pelanggan Dihormati'}
              </p>
              {order?.department && (
                <p className="text-xs text-stone-600 dark:text-stone-300">{order.department}</p>
              )}
              {order?.attn && (
                <p className="text-xs text-stone-600 dark:text-stone-300">Attn: {order.attn}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                {language === 'bm' ? 'Butiran Pesanan' : 'Booking Details'}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-medium">{language === 'bm' ? 'Nama:' : 'Name:'}</span> {order?.name || '-'}
              </p>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-medium">{language === 'bm' ? 'Telefon:' : 'Phone:'}</span> {order?.contact || '-'}
              </p>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-medium">{language === 'bm' ? 'Masa / Tarikh:' : 'Time / Date:'}</span> {order?.dateTime || dateStr}
              </p>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-medium">{language === 'bm' ? 'Lokasi:' : 'Location:'}</span> {order?.location || 'Restoran Wawasan'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">{language === 'bm' ? 'Butiran / Menu' : 'Description / Menu'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bm' ? 'Harga / Pax' : 'Price / Pax'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bm' ? 'Kuantiti' : 'Qty'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bm' ? 'Jumlah (RM)' : 'Amount (RM)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700 text-sm">
                {order?.meals && order.meals.length > 0 ? (
                  order.meals.map((meal, idx) => {
                    const mealPriceRaw = order?.prices?.[meal] as unknown;
                    const mealPrice = mealPriceRaw !== undefined && mealPriceRaw !== null && mealPriceRaw !== '' ? Number(mealPriceRaw) : null;
                    const qty = order?.quantity || 1;
                    const mealCount = order?.meals?.length || 1;
                    const pricePerPax = mealPrice !== null ? mealPrice : (totalAmount / (qty * mealCount));
                    const mealSubtotal = mealPrice !== null ? mealPrice * qty : (totalAmount / mealCount);

                    return (
                      <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                        <td className="py-3 px-4 font-medium capitalize">
                          {String(meal).replace(/_/g, ' ')}
                          {idx === 0 && order?.menu && <div className="text-xs text-stone-500 font-normal">{order.menu}</div>}
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-mono font-medium text-stone-700 dark:text-stone-300">
                          {isOrderFinal ? `RM ${pricePerPax.toFixed(2)}` : (language === 'bm' ? `Anggaran ${priceRangeStr}` : `Est. ${priceRangeStr}`)}
                        </td>
                        <td className="py-3 px-4 text-center">{qty} pax</td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {isOrderFinal ? `RM ${mealSubtotal.toFixed(2)}` : totalRangeStr}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-3 px-4 font-medium">
                      {order?.menu || (language === 'bm' ? 'Katering Makanan Tradisional & Melayu' : 'Traditional & Malay Catering Services')}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-mono font-medium text-stone-700 dark:text-stone-300">
                      {isOrderFinal ? `RM ${((order?.quantity || 1) > 0 ? totalAmount / (order?.quantity || 1) : totalAmount).toFixed(2)}` : (language === 'bm' ? `Anggaran ${priceRangeStr}` : `Est. ${priceRangeStr}`)}
                    </td>
                    <td className="py-3 px-4 text-center">{order?.quantity || 1} pax</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Bank Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-200/60 dark:border-orange-900/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                {language === 'bm' ? 'Maklumat Pembayaran (Bank)' : 'Bank Payment Details'}
              </h4>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-semibold">Bank:</span> Bank Muamalat Malaysia Berhad
              </p>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-semibold">{language === 'bm' ? 'Nama Akaun:' : 'Account Name:'}</span> RESTORAN WAWASAN
              </p>
              <p className="text-xs text-stone-700 dark:text-stone-300 font-mono">
                <span className="font-semibold font-sans">No. Akaun:</span> 16010000-405710
              </p>
            </div>

            <div className="flex flex-col justify-end space-y-2 text-right">
              <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400 px-2">
                <span>{language === 'bm' ? 'Subjumlah:' : 'Subtotal:'}</span>
                <span className="font-mono">{isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400 px-2 pb-2 border-b border-stone-200 dark:border-stone-700">
                <span>{language === 'bm' ? 'Cukai / SST (0%):' : 'Tax / SST (0%):'}</span>
                <span className="font-mono">{isOrderFinal ? 'RM 0.00' : '-'}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-bold text-stone-900 dark:text-white px-2 pt-1 bg-stone-100 dark:bg-stone-800 p-2 rounded-lg">
                <span>{language === 'bm' ? 'Jumlah Keseluruhan:' : 'Grand Total:'}</span>
                <span className="font-mono text-orange-600 dark:text-orange-400">
                  {isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}
                </span>
              </div>
            </div>
          </div>

          {order?.notes && (
            <div className="text-xs text-stone-600 dark:text-stone-400 bg-stone-100/70 dark:bg-stone-800/50 p-3 rounded-lg border border-stone-200 dark:border-stone-700">
              <span className="font-semibold">{language === 'bm' ? 'Nota Khas:' : 'Special Notes:'}</span> {order.notes}
            </div>
          )}

          <div className="text-center pt-4 microcopy-12 text-stone-500 dark:text-stone-500 border-t border-stone-200 dark:border-stone-800">
            {language === 'bm' ? 'Terima kasih atas sokongan anda kepada Restoran Wawasan.' : 'Thank you for your continued support to Restoran Wawasan.'}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-sm transition-colors"
          >
            {language === 'bm' ? 'Tutup' : 'Close'}
          </button>
          {onDownload && (
            <button
              onClick={() => {
                onDownload();
                if (onClose) onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              {language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

