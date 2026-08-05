import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCarouselProps {
  totalSlides: number;
  slidesToShow?: number;
  autoPlayInterval?: number;
  infinite?: boolean;
}

export function useCarousel({
  totalSlides,
  slidesToShow = 1,
  autoPlayInterval = 5000,
  infinite = true
}: UseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Touch support
  const touchStartX = useRef<number | null>(null);
  const touchMoveX = useRef<number | null>(null);

  const maxIndex = Math.max(0, totalSlides - slidesToShow);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return infinite ? 0 : prev;
      }
      return prev + 1;
    });
  }, [maxIndex, infinite]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return infinite ? maxIndex : prev;
      }
      return prev - 1;
    });
  }, [maxIndex, infinite]);

  useEffect(() => {
    if (isHovered || !autoPlayInterval) return;

    const timer = setInterval(() => {
      goNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [goNext, isHovered, autoPlayInterval]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchMoveX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchMoveX.current) return;

    const diff = touchStartX.current - touchMoveX.current;
    const threshold = 50;

    if (diff > threshold) {
      goNext();
    } else if (diff < -threshold) {
      goPrev();
    }

    touchStartX.current = null;
    touchMoveX.current = null;
  };

  return {
    currentIndex,
    setIsHovered,
    goNext,
    goPrev,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    containerRef,
    setCurrentIndex
  };
}
