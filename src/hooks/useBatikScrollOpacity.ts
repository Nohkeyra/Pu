import { useEffect } from 'react';

/**
 * Hook that listens to window scroll events and calculates scroll progress
 * for top (hero) and bottom (footer) batik sections, synchronizing opacity
 * via CSS custom variables (--batik-top-opacity and --batik-bottom-opacity).
 */
export function useBatikScrollOpacity() {
  useEffect(() => {
    let animationFrameId: number;

    const calculateScrollOpacity = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const viewportHeight = window.innerHeight || 800;
      const documentHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 2000;

      // --- Top (Hero) Batik Progress & Opacity ---
      // Smoothly fades out/darkens from 1.0 to 0.0 as page scrolls down from 0px
      const heroThreshold = Math.max(300, viewportHeight * 0.75);
      const topProgress = Math.min(1, Math.max(0, scrollY / heroThreshold));
      const topOpacity = (1 - topProgress).toFixed(3);

      // --- Bottom (Footer) Batik Progress & Opacity ---
      // Smoothly fades in from 0 to 1 as the footer scrolls into viewport
      const distanceFromBottom = Math.max(0, documentHeight - (scrollY + viewportHeight));
      const footerThreshold = Math.min(800, viewportHeight * 1.0);
      const bottomProgress = Math.min(1, Math.max(0, 1 - distanceFromBottom / footerThreshold));
      const bottomOpacity = bottomProgress.toFixed(3);

      // Update CSS variables on document element for synchronized CSS transitions
      document.documentElement.style.setProperty('--batik-top-opacity', topOpacity);
      document.documentElement.style.setProperty('--batik-bottom-opacity', bottomOpacity);
    };

    const handleScroll = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(calculateScrollOpacity);
    };

    // Calculate immediately on mount
    calculateScrollOpacity();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // IntersectionObserver for footer element as additional active scroll trigger
    const footerEl = document.querySelector('footer');
    let observer: IntersectionObserver | null = null;

    if (footerEl && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              handleScroll();
            }
          });
        },
        { threshold: [0, 0.2, 0.5, 0.8, 1.0] }
      );
      observer.observe(footerEl);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (observer && footerEl) {
        observer.unobserve(footerEl);
      }
    };
  }, []);
}
