import React, { useState } from 'react';
import { Utensils, Truck, CheckCircle, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export const CateringForm: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-cream dark:bg-[#030A09] text-deep-forest dark:text-stone-100 transition-colors duration-300">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121214] border border-border/80 dark:border-stone-800 shadow-xl transition-all">
        
        {/* Header Branding & Theme Toggle */}
        <div className="flex items-center justify-between pb-6 border-b border-border/40 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-deep-forest dark:text-white uppercase">
                Restoran Wawasan
              </h1>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Borang Tempahan Katering
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Form or Success View */}
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-deep-forest dark:text-white">
              Tempahan Diterima!
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Terima kasih <span className="font-bold text-amber-500">{customerName}</span>. Pihak Restoran Wawasan akan menghubungi anda dengan kadar segera.
            </p>
            <p className="text-xs font-mono px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 inline-block text-stone-500 dark:text-stone-400">
              Penghantaran: {needsDelivery ? 'Ya (Penghantaran Disediakan)' : 'Tidak (Ambil Sendiri)'}
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setCustomerName('');
                setNeedsDelivery(false);
              }}
              className="mt-4 w-full py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
            >
              Buat Tempahan Baru
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-6 space-y-6">
            
            {/* Input: Nama Penempah */}
            <div className="space-y-2">
              <label 
                htmlFor="customerName"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
              >
                Nama Penempah
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="customerName"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Encik Ahmad"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Custom Toggle Switch: Perlu Penghantaran? */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                    Perlu Penghantaran?
                  </span>
                  <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                    {needsDelivery ? 'Servis penghantaran ke lokasi' : 'Ambil di restoran'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={needsDelivery}
                onClick={() => setNeedsDelivery(!needsDelivery)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  needsDelivery ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    needsDelivery ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.98] shadow-lg shadow-amber-500/20 transition-all duration-200"
            >
              Sahkan Tempahan
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CateringForm;
