import { useEffect, useRef, useMemo } from 'react';
import { useGhostDemo } from './useGhostDemo';
import { GhostCursor } from './GhostCursor';
import { GhostCallout } from './GhostCallout';
import { getDemoScript } from './demoScript';

export interface DemoOverlayProps {
  active: boolean;
  onDone?: () => void;
  applyDemoUpdate: (key: string, value: any) => void;
  applyDemoStep: (step: number) => void;
}

export function DemoOverlay({
  active,
  onDone,
  applyDemoUpdate,
  applyDemoStep,
}: DemoOverlayProps) {
  const script = useMemo(() => {
    return getDemoScript();
  }, []);

  const { pos, gesture, callout, targetRect, playing } = useGhostDemo(script, {
    autoPlay: active,
    onDemoUpdate: (key: string, value: any) => {
      if (key === '__step') {
        applyDemoStep(value);
      } else {
        applyDemoUpdate(key, value);
      }
    },
  });

  const prevPlayingRef = useRef(playing);
  useEffect(() => {
    if (prevPlayingRef.current && !playing) {
      onDone?.();
    }
    prevPlayingRef.current = playing;
  }, [playing, onDone]);

  if (!active) return null;

  return (
    <>
      <GhostCursor pos={pos} gesture={gesture} />
      <GhostCallout callout={callout} targetRect={targetRect} />
    </>
  );
}
