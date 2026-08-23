import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface HungryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onHungryClick?: () => void;
  text: string;
}

export function HungryButton({ text, onHungryClick, className, ...props }: HungryButtonProps) {
  const [isChomping, setIsChomping] = useState(false);

  const handleClick = () => {
    if (isChomping) return;
    setIsChomping(true);
    
    // Let animation run, then trigger action
    setTimeout(() => {
      setIsChomping(false);
      if (onHungryClick) onHungryClick();
    }, 1200);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden w-full sm:w-auto px-8 py-4 bg-[var(--color-sunshine-cta)] text-white font-black rounded-2xl shadow-sunshine-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group/hungry",
        className
      )}
      {...props}
    >
      {/* Normal Button Content */}
      <motion.div 
        animate={{ y: isChomping ? 50 : 0, opacity: isChomping ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center gap-3 w-full"
      >
        <ShoppingBag className="w-5 h-5" />
        {text}
        <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover/hungry:translate-x-1" />
      </motion.div>

      {/* The Chomper Animation */}
      <AnimatePresence>
        {isChomping && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center bg-[var(--color-sunshine-cta)] text-white rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Pacman / Chomper */}
            <motion.div 
              initial={{ x: -100 }}
              animate={{ x: 100 }}
              transition={{ duration: 1.2, ease: "linear" }}
              className="relative flex items-center"
            >
              {/* Top jaw */}
              <motion.div
                animate={{ rotate: [-45, 0, -45, 0, -45, 0] }}
                transition={{ duration: 1.2, ease: "linear" }}
                className="w-10 h-5 bg-white rounded-t-full origin-bottom"
              />
              {/* Bottom jaw */}
              <motion.div
                animate={{ rotate: [45, 0, 45, 0, 45, 0] }}
                transition={{ duration: 1.2, ease: "linear" }}
                className="w-10 h-5 bg-white rounded-b-full origin-top absolute top-5 left-0"
              />
            </motion.div>
            
            {/* Food dots */}
            <motion.div 
              className="absolute flex gap-6 right-10"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="w-3 h-3 rounded-full bg-white/60" />
              <div className="w-3 h-3 rounded-full bg-white/80" />
              <div className="w-3 h-3 rounded-full bg-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
