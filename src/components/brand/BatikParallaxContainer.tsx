import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { cn, getAssetUrl } from '@/lib/utils';

export interface BatikParallaxContainerProps {
  className?: string;
  patternClassName?: string;
  patternUrl?: string;
  speed?: number; // relative parallax speed/intensity (default 0.16)
  offsetRange?: [number, number]; // explicit pixel range [min, max]
  opacity?: number;
  direction?: 'vertical' | 'subtle-drift';
  backgroundSize?: string;
  children?: React.ReactNode;
  ariaHidden?: boolean;
  style?: React.CSSProperties;
}

/**
 * BatikParallaxContainer
 *
 * Renders a GPU-accelerated parallax scrolling background motif using the
 * signature Restoran Wawasan traditional Malaysian batik pattern.
 * Creates an organic sense of visual depth in heritage sections while
 * respecting prefers-reduced-motion for complete accessibility.
 */
export const BatikParallaxContainer: React.FC<BatikParallaxContainerProps> = ({
  className,
  patternClassName,
  patternUrl,
  speed = 0.16,
  offsetRange,
  opacity = 0.05,
  direction = 'vertical',
  backgroundSize = '160px auto',
  children,
  ariaHidden = true,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const maxOffset = offsetRange ? offsetRange[1] : Math.max(12, Math.round(140 * speed));
  const minOffset = offsetRange ? offsetRange[0] : -maxOffset;

  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [minOffset, maxOffset]
  );

  const parallaxX = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion || direction !== 'subtle-drift'
      ? [0, 0]
      : [-Math.round(maxOffset * 0.25), Math.round(maxOffset * 0.25)]
  );

  const resolvedPattern = patternUrl || getAssetUrl('/assets/heritage/batik_pattern_hd.jpg');

  return (
    <div
      ref={containerRef}
      className={cn('batik-container overflow-hidden', className)}
      aria-hidden={ariaHidden}
      style={style}
      data-testid="batik-parallax-container"
    >
      <motion.div
        style={{
          y: parallaxY,
          x: parallaxX,
          backgroundImage: `url(${resolvedPattern})`,
          backgroundSize,
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          opacity,
          willChange: 'transform',
        }}
        className={cn(
          'batik-parallax-layer pointer-events-none absolute -inset-x-8 -inset-y-16 transform-gpu',
          patternClassName
        )}
        data-testid="batik-parallax-layer"
      />
      {children ? <div className="relative z-10 w-full h-full">{children}</div> : null}
    </div>
  );
};

export default BatikParallaxContainer;
