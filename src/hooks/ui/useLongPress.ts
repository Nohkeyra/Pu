import { useCallback, useRef } from 'react';
import { triggerMediumImpact } from '../../lib/haptics';

interface UseLongPressOptions {
  isPreventDefault?: boolean;
  delay?: number;
}

export function useLongPress(
  onLongPress: (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => void,
  onClick: (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => void,
  { isPreventDefault = true, delay = 500 }: UseLongPressOptions = {}
) {
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();
  const isLongPress = useRef(false);
  const isCancelled = useRef(false);

  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (event: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
      if (isPreventDefault && event.target) {
        event.target.addEventListener('contextmenu', preventDefault, {
          capture: true,
          once: true,
        });
      }
      if (timeout.current) clearTimeout(timeout.current);
      isLongPress.current = false;
      isCancelled.current = false;
      target.current = event.target;
      if ('clientX' in event) {
        startPos.current = { x: event.clientX, y: event.clientY };
      } else if ('touches' in event && event.touches.length > 0) {
        startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
      timeout.current = setTimeout(() => {
        isLongPress.current = true;
        triggerMediumImpact();
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay, isPreventDefault]
  );

  const clear = useCallback(
    (event: React.PointerEvent | React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      timeout.current = undefined;
      if (shouldTriggerClick && target.current && !isLongPress.current && !isCancelled.current) {
        onClick(event);
      }
      if (!shouldTriggerClick) isCancelled.current = true;
      startPos.current = null;
      const eventTarget = target.current;
      target.current = undefined;
      if (isPreventDefault && eventTarget) {
        setTimeout(() => {
          eventTarget.removeEventListener('contextmenu', preventDefault, { capture: true });
        }, 100);
      }
    },
    [onClick, isPreventDefault]
  );

  const move = useCallback((e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (!startPos.current) return;
    let currentX, currentY;
    if ('clientX' in e) {
      currentX = e.clientX;
      currentY = e.clientY;
    } else if ('touches' in e && e.touches.length > 0) {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      return;
    }
    const dx = currentX - startPos.current.x;
    const dy = currentY - startPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      isCancelled.current = true;
      clear(e, false);
    }
  }, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => { if (e.isPrimary && e.button === 0) start(e); },
    onPointerUp: (e: React.PointerEvent) => clear(e),
    onPointerLeave: (e: React.PointerEvent) => clear(e, false),
    onPointerMove: (e: React.PointerEvent) => move(e),
    onPointerCancel: (e: React.PointerEvent) => clear(e, false),
  };
}

const preventDefault = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};
