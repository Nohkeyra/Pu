import React, { useEffect, useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { useDeviceMotion3D, useBatikVisibilityRef } from '@/hooks/useDeviceMotion3D';
import { getAssetUrl } from '@/lib/utils';

interface Batik3DMotionProps {
  className?: string;
  imgClassName?: string;
  maxRotation?: number;
  opacity?: number;
  mode?: 'img' | 'background';
  overlayClassName?: string;
  maskImage?: string;
  mixBlendMode?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  style?: React.CSSProperties;
  alt?: string;
  src?: string;
}

export const Batik3DMotion: React.FC<Batik3DMotionProps> = ({
  className = '',
  imgClassName = '',
  maxRotation = 14,
  opacity,
  mode = 'img',
  overlayClassName = '',
  maskImage,
  mixBlendMode,
  backgroundSize = '240px auto',
  backgroundRepeat = 'repeat',
  style = {},
  alt = 'Batik Pattern Background',
  src,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useBatikVisibilityRef();

  // F-DUP: freeze this instance's tilt output at 0 while it's off-screen or
  // hidden behind another element (e.g. a page's batik layer sitting behind
  // an open AuthModal, or the footer's layer before the user scrolls down).
  // The shared listener in BatikMotionProvider keeps running either way
  // (that's the point — one listener for the whole app), but an invisible
  // instance no longer spends work animating a transform nobody can see.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: '200px' } // start animating slightly before it enters view
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisibleRef]);

  const { rotateX, rotateY } = useDeviceMotion3D(maxRotation, isVisibleRef);
  
  // Subtle translation parallax for extra 3D depth
  const moveX = useTransform(rotateY, (rY) => rY * 0.65);
  const moveY = useTransform(rotateX, (rX) => -rX * 0.65);

  const batikUrl = src || getAssetUrl('/assets/heritage/batik_pattern_hd.jpg');

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none [perspective:1200px] z-0 ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {mode === 'img' ? (
        <motion.img
          src={batikUrl}
          alt={alt}
          fetchPriority="high"
          decoding="async"
          style={{
            rotateX,
            rotateY,
            x: moveX,
            y: moveY,
            scale: 1.1,
            maskImage,
            WebkitMaskImage: maskImage,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            ...style,
          }}
          className={`absolute -inset-[6%] h-[112%] w-[112%] transform-gpu object-cover object-center ${imgClassName}`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback to batik_vector_pattern.jpg if primary asset path is unavailable
            const target = e.currentTarget;
            if (!target.src.includes('batik_vector_pattern.jpg')) {
              target.src = getAssetUrl('/assets/heritage/batik_vector_pattern.jpg');
            }
          }}
        />
      ) : (
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: moveX,
            y: moveY,
            scale: 1.1,
            backgroundImage: `url(${batikUrl})`,
            backgroundSize,
            backgroundRepeat,
            backgroundPosition: 'center',
            mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
            maskImage,
            WebkitMaskImage: maskImage,
            opacity,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            ...style,
          }}
          className={`absolute -inset-[6%] h-[112%] w-[112%] transform-gpu ${imgClassName}`}
        />
      )}
      {overlayClassName && <div className={overlayClassName} />}
    </div>
  );
};
