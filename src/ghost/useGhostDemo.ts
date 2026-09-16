import { useState, useEffect, useRef, useCallback } from 'react';
import './ghost.css';
import { CalloutSpec, GhostAction } from './types';
import { createGhostPlayer } from './GhostPlayer';

export interface UseGhostDemoOptions {
  autoPlay?: boolean;
  onDemoUpdate?: (key: string, value: any) => void;
}

export function useGhostDemo(script: GhostAction[], options: UseGhostDemoOptions = {}) {
  const { autoPlay = false, onDemoUpdate } = options;

  const onDemoUpdateRef = useRef(onDemoUpdate);
  useEffect(() => {
    onDemoUpdateRef.current = onDemoUpdate;
  }, [onDemoUpdate]);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [gesture, setGesture] = useState<'tap' | 'type' | 'scroll' | 'select' | 'swipe' | 'idle'>('idle');
  const [callout, setCallout] = useState<CalloutSpec | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);

  const playerRef = useRef<ReturnType<typeof createGhostPlayer> | null>(null);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
    setPos(null);
    setCallout(null);
    setTargetRect(null);
    setGesture('idle');
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    console.log('[ghost] start called', script?.length);
    if (!playerRef.current) return;
    if (playerRef.current) {
      playerRef.current.stop();
    }
    setPlaying(true);
    playerRef.current.play(script);
  }, [script]);

  useEffect(() => {
    playerRef.current = createGhostPlayer({
      onPos: setPos,
      onGesture: setGesture,
      onCallout: setCallout,
      onTargetRect: setTargetRect,
      onDemoUpdate: (key, value) => {
        onDemoUpdateRef.current?.(key, value);
      },
      onDone: () => {
        setPlaying(false);
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;

    const handleUserInteraction = () => {
      stop();
    };

    window.addEventListener('pointerdown', handleUserInteraction, { once: true, capture: true });
    window.addEventListener('touchstart', handleUserInteraction, { once: true, capture: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction, { capture: true });
    };
  }, [playing, stop]);

  useEffect(() => {
    if (autoPlay) {
      start();
    }
  }, [autoPlay, start]);

  return {
    pos,
    gesture,
    callout,
    targetRect,
    playing,
    start,
    stop,
  };
}
