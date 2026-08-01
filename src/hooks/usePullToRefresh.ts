import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshProps {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use refs for touch tracking so callbacks don't need to re-register on every render
  const startYRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only arm pull-to-refresh if page is truly at the top.
    // Use a small tolerance (2px) to handle subpixel/floating-point scroll values
    // that some mobile browsers report even when visually at the top.
    if (window.scrollY <= 2) {
      startYRef.current = e.touches[0].pageY;
    } else {
      startYRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null || isRefreshingRef.current) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startYRef.current;

    // Only activate for downward swipes
    if (diff <= 0) {
      // User swiped up — disarm to avoid accidental triggers
      startYRef.current = null;
      setPullDistance(0);
      return;
    }

    // Damping effect so it feels natural and doesn't race to threshold too fast
    const dampedDiff = Math.pow(diff, 0.8);
    setPullDistance(dampedDiff);

    // Block native browser scroll/pull-to-refresh while we're handling it
    if (dampedDiff > 5 && e.cancelable) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;

    const currentPull = pullDistance;
    startYRef.current = null;

    if (currentPull > threshold && !isRefreshingRef.current) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Hold indicator at threshold during refresh
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
