import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useReducedMotion } from 'motion/react';

// The reference player marks frames 32–57 as the pull. Start just before
// that section and move the page while the hands are pulling.
const START_SECONDS = 0.65;
const PREPARE_MS = 400;
const PULL_MS = 750;
const PLAY_TIMEOUT_MS = 800;

type PendingTransition = { target: number };

/** Coordinates the supplied transparent mascot clip with the actual form step. */
export function useMascotStepTransition(step: number, setStep: Dispatch<SetStateAction<number>>, disabled: boolean) {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pending = useRef<PendingTransition | null>(null);
  const timers = useRef<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [visible, setVisible] = useState(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  const finishWithoutAnimation = useCallback(() => {
    const target = pending.current?.target;
    if (target === undefined) {
      setVisible(false);
      return;
    }
    pending.current = null;
    clearTimers();
    videoRef.current?.pause();
    setVisible(false);
    setPulling(false);
    setBusy(false);
    setStep(target);
  }, [clearTimers, setStep]);

  useEffect(() => () => {
    pending.current = null;
    clearTimers();
    videoRef.current?.pause();
  }, [clearTimers]);

  const navigate = useCallback<Dispatch<SetStateAction<number>>>((action) => {
    if (pending.current) return;
    const target = typeof action === 'function' ? action(step) : action;
    if (target === step) return;
    const video = videoRef.current;
    // The form stays usable on devices where video cannot be decoded or is not ready.
    if (disabled || reduceMotion || step > 4 || target > 4 || !video || video.readyState < 2 || video.error) {
      clearTimers();
      setVisible(false);
      setStep(target);
      return;
    }

    clearTimers();
    const request = { target };
    pending.current = request;
    setBusy(true);
    setPulling(false);
    setVisible(false);
    try {
      video.currentTime = START_SECONDS;
      const watchdog = window.setTimeout(finishWithoutAnimation, PLAY_TIMEOUT_MS);
      timers.current.push(watchdog);
      void video.play().then(() => {
        if (pending.current !== request) return;
        window.clearTimeout(watchdog);
        setVisible(true);
        timers.current.push(window.setTimeout(() => setPulling(true), PREPARE_MS));
        timers.current.push(window.setTimeout(() => {
          if (pending.current !== request) return;
          pending.current = null;
          video.pause();
          setVisible(false);
          setStep(request.target);
          setPulling(false);
          setBusy(false);
        }, PREPARE_MS + PULL_MS));
      }).catch(() => {
        if (pending.current === request) finishWithoutAnimation();
      });
    } catch {
      finishWithoutAnimation();
    }
  }, [clearTimers, disabled, finishWithoutAnimation, reduceMotion, setStep, step]);

  return { videoRef, busy, pulling, visible, navigate, finishWithoutAnimation, pullDuration: PULL_MS / 1000 };
}
