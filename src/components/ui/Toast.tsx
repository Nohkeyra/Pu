/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, X, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const timersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const toast = useCallback(({ title, description, variant = 'info', duration = 4000 }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant, duration }]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { id, title, description, variant = 'info' } = toast;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-kiwi shrink-0" />,
    error: <XCircle className="w-5 h-5 text-tomato-burst shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-sunshine shrink-0" />,
    info: <Sun className="w-5 h-5 text-sunshine shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-forest-green border-kiwi/20 shadow-kiwi/5',
    error: 'bg-forest-green border-tomato-burst/20 shadow-tomato-burst/5',
    warning: 'bg-forest-green border-sunshine/20 shadow-sunshine/5',
    info: 'bg-forest-green border-sunshine/20 shadow-sunshine/5',
  };

  const stripeColors = {
    success: 'bg-kiwi',
    error: 'bg-tomato-burst',
    warning: 'bg-sunshine',
    info: 'bg-sunshine',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 max-w-full relative overflow-hidden",
        bgStyles[variant]
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", stripeColors[variant])} />

      <div className="pl-1 shrink-0">{icons[variant]}</div>

      <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
        {title && (
          <h4 className="text-sm font-bold text-deep-forest leading-tight mb-1">
            {title}
          </h4>
        )}
        <p className="text-xs text-stone font-sans leading-relaxed break-words">
          {description}
        </p>
      </div>

      <button
        onClick={() => onDismiss(id)}
        className="text-stone/50 hover:text-deep-forest p-0.5 rounded-lg hover:bg-deep-forest/5 transition-colors shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
