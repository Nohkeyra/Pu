import { useState, useEffect } from 'react';

export function useHeaderScroll(heroHeight: number = window.innerHeight) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > heroHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [heroHeight]);

  return isScrolled;
}
