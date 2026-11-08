import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    // Initial check in case the page is already scrolled down on load
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  // The order wizard already has a persistent Next/Submit bar. A floating
  // scroll control overlaps that critical action on narrow screens.
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/order')) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.8 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed right-3 md:right-6 z-[110] min-h-[48px] min-w-[48px] p-2.5 md:p-3 bg-gradient-to-tr from-sunshine to-crisp-carrot text-[color:color-mix(in_srgb,var(--ui-on-yellow)_80%,black)] rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-action)] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 flex items-center justify-center bottom-[calc(80px+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,12px)))]"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
