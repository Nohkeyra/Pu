import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshProps {
  onRefresh: () => Promise<void>;
  threshold?: number;
  /** Maximum clientY (viewport touch Y position) allowed to initiate pull-to-refresh. Default: 150px (header/top region) */
  maxHeaderTouchY?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80, maxHeaderTouchY = 150 }: UsePullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use refs for touch tracking so callbacks don't need to re-register on every render
  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Keep ref in sync with state
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const updatePullDistance = (val: number) => {
    pullDistanceRef.current = val;
    setPullDistance(val);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshingRef.current) return;

    // 1. Ensure document scroll position is strictly at the top of the page (within 2px tolerance)
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop > 2) {
      startYRef.current = null;
      return;
    }

    // 2. Ensure touch starts in the header / top app region only (viewport clientY)
    const touch = e.touches[0];
    if (!touch || touch.clientY > maxHeaderTouchY) {
      startYRef.current = null;
      return;
    }

    // 3. Ensure no sub-container (e.g. scrollable div or table/modal) under touch target is scrolled down
    let isSubContainerScrolled = false;
    let target = e.target as HTMLElement | null;
    while (target && target !== document.body && target !== document.documentElement) {
      if (target.scrollTop > 2) {
        isSubContainerScrolled = true;
        break;
      }
      target = target.parentElement;
    }

    if (!isSubContainerScrolled) {
      startYRef.current = touch.pageY;
    } else {
      startYRef.current = null;
    }
  }, [maxHeaderTouchY]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null || isRefreshingRef.current) return;

    // Double check scroll position remains strictly at top
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop > 2) {
      startYRef.current = null;
      updatePullDistance(0);
      return;
    }

    const currentY = e.touches[0].pageY;
    const diff = currentY - startYRef.current;

    // Only activate for downward swipes
    if (diff <= 0) {
      // User swiped up — disarm to avoid accidental triggers
      startYRef.current = null;
      updatePullDistance(0);
      return;
    }

    // Damping effect so it feels natural and doesn't race to threshold too fast
    const dampedDiff = Math.pow(diff, 0.8);
    updatePullDistance(dampedDiff);

    // Block native browser scroll/pull-to-refresh while we're handling it
    if (dampedDiff > 5 && e.cancelable) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;

    const currentPull = pullDistanceRef.current;
    startYRef.current = null;

    if (currentPull > threshold && !isRefreshingRef.current) {
      setIsRefreshing(true);
      updatePullDistance(threshold); // Hold indicator at threshold during refresh
      try {
        await onRefreshRef.current();
      } finally {
        setIsRefreshing(false);
        updatePullDistance(0);
      }
    } else {
      updatePullDistance(0);
    }
  }, [threshold]);

  // BUG FIX (audit 2026-08-28): touchend was the only place that reset
  // startYRef/pullDistance, but the OS can interrupt an in-progress touch
  // (a system gesture, an incoming notification, multi-touch, the
  // screen-recording overlay, etc.) by firing touchcancel instead of
  // touchend. Without this handler, that interruption would leave the pull
  // gesture permanently "armed" — pullDistance stuck at a nonzero value and,
  // if isRefreshing had already flipped true, the "Refreshing..." indicator
  // stuck on screen forever with no way to clear it. A cancelled gesture is
  // never treated as a completed pull — it just resets state, same as an
  // under-threshold release.
  const handleTouchCancel = useCallback(() => {
    startYRef.current = null;
    if (!isRefreshingRef.current) {
      updatePullDistance(0);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return { pullDistance, isRefreshing };
}
