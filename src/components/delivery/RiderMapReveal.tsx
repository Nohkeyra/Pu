import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

/** Live DOM anchors, captured from the actual order card and tracking control. */
export interface TrackingMapOrigin {
  card: HTMLElement;
  trigger: HTMLElement;
}

/** Source-anchored map reveal and control-to-details FLIP. The Leaflet instance
 * stays mounted at its final size throughout; only clipping/compositing moves. */
export function RiderMapReveal({ origin, closing, onClosed, children }: {
  origin: TrackingMapOrigin;
  closing: boolean;
  onClosed: () => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const complete = useRef(onClosed);
  const targetDock = useRef<DOMRect | null>(null);
  const dockColor = useRef<string | null>(null);
  const first = useRef(true);
  useEffect(() => { complete.current = onClosed; }, [onClosed]);

  useLayoutEffect(() => {
    const stage = root.current;
    const dock = stage?.querySelector<HTMLElement>('.rider-sheet');
    const body = stage?.querySelector<HTMLElement>('.rider-sheet-body');
    const header = stage?.querySelector<HTMLElement>('.rider-header');
    if (!stage || !dock || !body || !header) return;
    const animations: Animation[] = [];
    const targetColor = dockColor.current ?? getComputedStyle(dock).backgroundColor;
    dockColor.current = targetColor;
    const sourceColor = getComputedStyle(origin.trigger).backgroundColor;
    const finalClip = 'inset(0px 0px 0px 0px round 0px)';
    const reset = () => {
      animations.forEach(animation => animation.cancel());
      stage.style.clipPath = finalClip;
      dock.style.transform = 'none';
      dock.style.backgroundColor = targetColor;
      body.style.opacity = '1';
      header.style.opacity = '1';
    };
    if (reduced || !stage.animate || !origin.card.isConnected || !origin.trigger.isConnected) {
      reset();
      stage.dataset.phase = closing ? 'closed' : 'open';
      if (closing) complete.current();
      return;
    }

    const viewport = stage.getBoundingClientRect();
    const card = origin.card.getBoundingClientRect();
    const trigger = origin.trigger.getBoundingClientRect();
    const target = targetDock.current ?? dock.getBoundingClientRect();
    targetDock.current = target;
    const clampY = (value: number) => Math.max(0, Math.min(viewport.height, value));
    const clampX = (value: number) => Math.max(0, Math.min(viewport.width, value));
    const sourceClip = `inset(${clampY(card.top - viewport.top)}px ${clampX(viewport.right - card.right)}px ${clampY(viewport.bottom - card.bottom)}px ${clampX(card.left - viewport.left)}px round 16px)`;
    const sourceDock = `translate(${trigger.left - target.left}px, ${trigger.top - target.top}px) scale(${trigger.width / Math.max(1, target.width)}, ${trigger.height / Math.max(1, target.height)})`;
    if (first.current) {
      stage.style.clipPath = sourceClip;
      dock.style.transform = sourceDock;
      dock.style.backgroundColor = sourceColor;
      body.style.opacity = '0';
      header.style.opacity = '0';
      first.current = false;
    }
    stage.dataset.phase = closing ? 'closing' : 'opening';
    // Interruption starts from the current pixels, including a Back press mid-open.
    const options: KeyframeAnimationOptions = {
      duration: reduced ? 0 : closing ? 320 : 480,
      easing: 'cubic-bezier(.22,1,.36,1)',
      fill: 'both',
    };
    const mapAnimation = stage.animate({ clipPath: [getComputedStyle(stage).clipPath, closing ? sourceClip : finalClip] }, options);
    animations.push(mapAnimation,
      dock.animate({ transform: [getComputedStyle(dock).transform, closing ? sourceDock : 'none'], backgroundColor: [getComputedStyle(dock).backgroundColor, closing ? sourceColor : targetColor], borderRadius: closing ? ['26px', '999px'] : ['999px', '26px'] }, options),
      body.animate({ opacity: [Number(getComputedStyle(body).opacity), closing ? 0 : 1] }, { duration: closing ? 100 : 200, delay: closing ? 0 : 220, fill: 'both' }),
      header.animate({ opacity: [Number(getComputedStyle(header).opacity), closing ? 0 : 1] }, { duration: closing ? 100 : 180, delay: closing ? 0 : 220, fill: 'both' }),
    );
    void mapAnimation.finished.then(() => {
      stage.dataset.phase = closing ? 'closed' : 'open';
      if (closing) complete.current();
    }).catch(() => { /* Cancellation is expected on reversal/unmount/rotation. */ });
    const resize = () => {
      reset();
      targetDock.current = dock.getBoundingClientRect();
      stage.dataset.phase = closing ? 'closed' : 'open';
      if (closing) complete.current();
    };
    window.addEventListener('resize', resize);
    return () => {
      // Keep composited progress before cancellation so reversing cannot jump.
      stage.style.clipPath = getComputedStyle(stage).clipPath;
      dock.style.transform = getComputedStyle(dock).transform;
      dock.style.backgroundColor = getComputedStyle(dock).backgroundColor;
      body.style.opacity = getComputedStyle(body).opacity;
      header.style.opacity = getComputedStyle(header).opacity;
      animations.forEach(animation => animation.cancel());
      window.removeEventListener('resize', resize);
    };
  }, [origin, closing, reduced]);

  return <div ref={root} className="rider-map-reveal">{children}</div>;
}
