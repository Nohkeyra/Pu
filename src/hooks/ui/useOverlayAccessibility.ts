import { useEffect, type RefObject } from 'react';

interface UseOverlayAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  /** Container ref for the dialog/panel whose descendants should trap focus. */
  containerRef: RefObject<HTMLElement | null>;
  /** When true, the lock restores focus to the element that was
   *  active when the overlay opened. Default true. */
  restoreFocus?: boolean;
  /** When true, body scrolling is locked while the overlay is open. Default true. */
  lockBodyScroll?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Shared overlay behaviour for dialogs, drawers, sheets and menus.
 *
 * - Escape-key closes the overlay.
 * - Tab focus is trapped inside the container.
 * - Body scrolling is locked while open.
 * - Focus is restored to the previously-focused element on close.
 */
export function useOverlayAccessibility({
  isOpen,
  onClose,
  containerRef,
  restoreFocus = true,
  lockBodyScroll = true,
}: UseOverlayAccessibilityOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;

    const focusFirst = () => {
      const container = containerRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Defer focus to next tick so the overlay has rendered.
    const focusTimer = window.setTimeout(focusFirst, 0);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (lockBodyScroll) {
        document.body.style.overflow = originalOverflow;
      }
      if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose, containerRef, restoreFocus, lockBodyScroll]);
}
