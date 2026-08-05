import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

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
      behavior: 'smooth',
    });
  };

  // Don't show on the login page
  if (location.pathname === '/' || location.pathname === '/login') {
    return null;
  }

  const isOrderPage = location.pathname.startsWith('/order');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          onClick={scrollToTop}
          className={`fixed right-4 md:right-6 z-[110] p-3 md:p-3.5 bg-gradient-to-tr from-sunshine to-crisp-carrot text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-sunshine-glow hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center ${
            isOrderPage
              ? 'bottom-[calc(148px+env(safe-area-inset-bottom,12px))] lg:bottom-[calc(88px+env(safe-area-inset-bottom,12px))]'
              : 'bottom-[calc(88px+env(safe-area-inset-bottom,12px))]'
          }`}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
