/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast — P3 status-token aligned.
 *
 * Changes:
 *   • Info variant added (was a stub using the `Sun` icon).
 *   • Border + stripe colours driven by --color-success / --color-warning
 *     / --color-error (defined in index.css) instead of ad-hoc opacity
 *     stacks such as `bg-forest-green border-kiwi/20`.
 *   • Title / description use page-header-text + text-helper for
 *     consistent legibility, never opacity hacks.
 *   • Close button now 44 × 44 px (P0) with proper focus ring.
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
  toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) { clearTimeout(timersRef.current[id]); delete timersRef.current[id]; }
  }, []);

  const toast = useCallback(({ title, description, variant = 'info', duration = 4000 }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant, duration }]);
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps { toasts: ToastMessage[]; dismiss: (id: string) => void; }
const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismiss }) => (
  <div
    className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,12px))] right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
    aria-live="polite"
  >
    <AnimatePresence>
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
    </AnimatePresence>
  </div>
);

interface ToastItemProps { toast: ToastMessage; onDismiss: (id: string) => void; }
const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { id, title, description, variant = 'info' } = toast;
  const variants = {
    success: { Icon: CheckCircle2, iconClass: 'text-[var(--color-success)]',  stripe: 'bg-[var(--color-success)]',  surface: 'bg-card border-[color-mix(in_srgb,var(--color-success)_22%,transparent)]' },
    error:   { Icon: XCircle,         iconClass: 'text-[var(--color-error)]',    stripe: 'bg-[var(--color-error)]',    surface: 'bg-card border-[color-mix(in_srgb,var(--color-error)_22%,transparent)]'   },
    warning: { Icon: AlertTriangle,   iconClass: 'text-[var(--color-warning)]',  stripe: 'bg-[var(--color-warning)]',  surface: 'bg-card border-[color-mix(in_srgb,var(--color-warning)_22%,transparent)]' },
    info:    { Icon: Info,            iconClass: 'text-[var(--color-sunshine-cta)]',                 stripe: 'bg-[var(--color-sunshine-cta)]',                 surface: 'bg-card border-[var(--color-sunshine-cta)]/20' },
  } as const;
  const V = variants[variant];
  const Icon = V.Icon;

  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition-all duration-200 max-w-full relative overflow-hidden",
        V.surface
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", V.stripe)} />
      <div className="pl-1 shrink-0">
        <Icon className={cn("w-5 h-5", V.iconClass)} />
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
        {title && <h4 className="text-sm font-bold page-header-text leading-tight mb-1">{title}</h4>}
        {description && <p className="text-helper text-sm font-sans leading-relaxed break-words">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Close notification"
        className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-stone hover:text-deep-forest rounded-lg hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] dark:hover:bg-white/10 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
