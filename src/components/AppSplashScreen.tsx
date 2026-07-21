import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';

interface AppSplashScreenProps {
  isLoading: boolean;
}

const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ isLoading }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShow(false);
      }, 400); // Small delay before fading out for smoother finish
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream dark:bg-background"
        >
          <div className="relative flex flex-col items-center">
            {/* Pulsing ring background */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 0.8],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute inset-[-40px] rounded-full bg-sunshine/20 blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative z-10"
            >
              <img 
                src={getAssetUrl('/assets/wawasan_logo.jpg')} 
                alt="Restoran Wawasan Logo" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl rounded-full"
                onError={(e) => {
                  // Fallback if logo is not found
                  (e.currentTarget as HTMLImageElement).src = "https://placehold.co/200x200/F97316/FFFFFF?text=RW";
                }}
              />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-8 flex flex-col items-center"
            >
              <h1 className="text-2xl md:text-3xl font-black text-charcoal dark:text-white tracking-tighter uppercase">
                Restoran <span className="text-sunshine">Wawasan</span>
              </h1>
              
              <div className="mt-6 flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.3,
                      ease: "easeInOut" 
                    }}
                    className="w-1.5 h-1.5 rounded-full bg-sunshine"
                  />
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1, duration: 1.5 }}
            className="absolute bottom-12 text-[10px] font-bold text-charcoal/40 dark:text-white/40 uppercase tracking-[0.2em]"
          >
            EST. 1997 • Katering Terbaik
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppSplashScreen;
