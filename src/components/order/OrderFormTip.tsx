import { useEffect, useState } from 'react'
import { X, Lightbulb } from 'lucide-react'

const STORAGE_KEY = 'wawasan_order_tip_dismissed_v1'

/**
 * One-time tip for the catering order wizard. Dismissible; does not show again.
 */
export function OrderFormTip({ language }: { language: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
      setVisible(true)
    } catch {
      /* ignore */
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-deep-forest dark:text-white"
    >
      <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">
          {language === 'bm' ? 'Petua pantas' : 'Quick tip'}
        </p>
        <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
          {language === 'bm'
            ? 'Lengkapkan setiap langkah. Draf disimpan automatik pada peranti ini jika anda keluar sekejap.'
            : 'Complete each step in order. Your draft is auto-saved on this device if you leave briefly.'}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
        aria-label={language === 'bm' ? 'Tutup' : 'Dismiss'}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
