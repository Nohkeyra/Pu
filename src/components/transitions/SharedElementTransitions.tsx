import React, { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerCartBounceHaptic, triggerSelectionTick, triggerSheetSnapHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface SpringCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  layoutId?: string;
}

/**
 * SpringCard: Fluid touch-reactive container with spring physics and tactile tick
 */
export const SpringCard: React.FC<SpringCardProps> = ({
  children,
  className,
  onClick,
  layoutId,
}) => {
  return (
    <motion.div
      layoutId={layoutId}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => {
        triggerSelectionTick();
        onClick?.();
      }}
      className={cn('cursor-pointer will-change-transform', className)}
    >
      {children}
    </motion.div>
  );
};

interface FloatingBadgeProps {
  count: number;
  className?: string;
}

/**
 * FloatingBadge: Animated badge that pops and bounces whenever the count changes
 */
export const FloatingBadge: React.FC<FloatingBadgeProps> = ({ count, className }) => {
  return (
    <AnimatePresence mode="wait">
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [1, 1.35, 1], opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          onAnimationStart={() => {
            triggerCartBounceHaptic();
          }}
          className={cn(
            'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-black text-white bg-amber-600 rounded-full shadow-md pointer-events-none',
            className
          )}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

interface SmoothModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

/**
 * SmoothModalSheet: Fluid bottom sheet with spring sliding transition and backdrop blur
 */
export const SmoothModalSheet: React.FC<SmoothModalSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              triggerSheetSnapHaptic();
              onClose();
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onAnimationStart={() => {
              triggerSheetSnapHaptic();
            }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-white dark:bg-stone-900 rounded-t-3xl shadow-2xl border-t border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden"
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
            </div>

            {title && (
              <div className="px-6 py-2 border-b border-stone-100 dark:border-stone-800/60">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
              </div>
            )}

            <div className="p-6 overflow-y-auto overscroll-contain flex-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
