import { CalloutSpec, GhostAction } from './types';

export interface GhostPlayerCallbacks {
  onPos: (pos: { x: number; y: number } | null) => void;
  onGesture: (gesture: 'tap' | 'type' | 'scroll' | 'select' | 'swipe' | 'idle') => void;
  onCallout: (callout: CalloutSpec | null) => void;
  onTargetRect: (rect: DOMRect | null) => void;
  onDemoUpdate?: (key: string, value: any) => void;
  onDone?: () => void;
}

export function createGhostPlayer(callbacks: GhostPlayerCallbacks) {
  let cancelled = false;
  let activeElement: HTMLElement | null = null;
  let activeClass: string | null = null;

  const cleanupActive = () => {
    if (activeElement && activeClass) {
      activeElement.classList.remove(activeClass);
      activeElement = null;
      activeClass = null;
    }
  };

  const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      if (cancelled) {
        resolve();
        return;
      }
      setTimeout(() => {
        resolve();
      }, ms);
    });
  };

  const play = async (script: GhostAction[]): Promise<void> => {
    cancelled = false;

    let isFirst = true;
    for (const action of script) {
      if (cancelled) return;

      if (isFirst) {
        console.log('[ghost] first action', action);
        isFirst = false;
      }

      console.log('[ghost] runAction', action.type, action.selector);

      if (action.type === 'wait') {
        callbacks.onGesture('idle');
        await sleep(action.delay);
        if (cancelled) return;
        continue;
      }

      if (!action.selector) {
        await sleep(action.delay);
        if (cancelled) return;
        continue;
      }

      const el = document.querySelector(action.selector) as HTMLElement | null;
      console.log('[ghost] target found?', !!el, action.selector);
      if (!el) {
        // Skip action gracefully if target missing
        continue;
      }

      // 1. Scroll target into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(900); // Wait for the smooth scroll to completely settle to ensure perfect coordinates
      if (cancelled) return;

      // 2. Get target rect and center position
      let r = el.getBoundingClientRect();
      callbacks.onTargetRect(r);
      callbacks.onPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

      // 3. Handle callout if present
      if (action.callout) {
        callbacks.onCallout(action.callout);
        await sleep(action.callout.duration);
        if (cancelled) return;
        callbacks.onCallout(null);
      }

      // Re-evaluate target coordinates immediately before the gesture trigger
      // to handle any dynamic layout shifts or callout resize shifts!
      r = el.getBoundingClientRect();
      callbacks.onTargetRect(r);
      callbacks.onPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

      // 4. Perform action
      switch (action.type) {
        case 'tap': {
          callbacks.onGesture('tap');
          el.classList.add('ghost-target');
          activeElement = el;
          activeClass = 'ghost-target';
          await sleep(400);
          if (cancelled) return;
          el.classList.remove('ghost-target');
          activeElement = null;
          activeClass = null;
          break;
        }
        case 'type': {
          callbacks.onGesture('type');
          const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
          const originalValue = inputEl.value ?? '';
          const textToType = action.text ?? '';
          const speed = action.speed ?? 80;

          for (let i = 1; i <= textToType.length; i++) {
            if (cancelled) return;
            inputEl.value = textToType.slice(0, i);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(speed);
          }

          await sleep(500);
          if (cancelled) return;

          inputEl.value = originalValue;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          break;
        }
        case 'scroll': {
          callbacks.onGesture('scroll');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(500);
          break;
        }
        case 'select': {
          callbacks.onGesture('select');
          el.classList.add('ghost-target');
          activeElement = el;
          activeClass = 'ghost-target';
          await sleep(500);
          if (cancelled) return;
          el.classList.remove('ghost-target');
          activeElement = null;
          activeClass = null;
          break;
        }
        case 'swipe': {
          callbacks.onGesture('swipe');
          const swipeRect = el.getBoundingClientRect();
          const startX = swipeRect.right - 20;
          const endX = swipeRect.left + 20;
          const centerY = swipeRect.top + swipeRect.height / 2;
          const steps = 10;
          const stepDuration = 400 / steps;

          for (let step = 0; step <= steps; step++) {
            if (cancelled) return;
            const progress = step / steps;
            const currentX = startX + (endX - startX) * progress;
            callbacks.onPos({ x: currentX, y: centerY });
            await sleep(stepDuration);
          }
          break;
        }
        case 'glow': {
          callbacks.onGesture('idle');
          el.classList.add('ghost-glow');
          activeElement = el;
          activeClass = 'ghost-glow';
          await sleep(action.glowDuration || 3000);
          if (cancelled) return;
          if (!action.persistGlow) {
            el.classList.remove('ghost-glow');
            activeElement = null;
            activeClass = null;
          }
          break;
        }
      }

      if (cancelled) return;

      // 5. Apply state demoUpdate AFTER visual action completes
      if (action.demoUpdate && callbacks.onDemoUpdate) {
        for (const [key, value] of Object.entries(action.demoUpdate)) {
          callbacks.onDemoUpdate(key, value);
        }
      }

      // 6. Sleep delay
      await sleep(action.delay);
      if (cancelled) return;
    }

    if (!cancelled) {
      cleanupActive();
      callbacks.onGesture('idle');
      callbacks.onPos(null);
      callbacks.onTargetRect(null);
      callbacks.onCallout(null);
      callbacks.onDone?.();
    }
  };

  const stop = () => {
    cancelled = true;
    cleanupActive();
    document.querySelectorAll('.ghost-target, .ghost-glow').forEach((el) => {
      el.classList.remove('ghost-target', 'ghost-glow');
    });
    callbacks.onPos(null);
    callbacks.onCallout(null);
    callbacks.onTargetRect(null);
    callbacks.onGesture('idle');
  };

  return { play, stop };
}
