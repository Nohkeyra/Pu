import React from 'react';
import { motion, useTransform } from 'motion/react';
import { useDeviceMotion3D } from '@/hooks/useDeviceMotion3D';
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
  const { rotateX, rotateY } = useDeviceMotion3D(maxRotation);
  
  // Subtle translation parallax for extra 3D depth
  const moveX = useTransform(rotateY, (rY) => rY * 0.65);
  const moveY = useTransform(rotateX, (rX) => -rX * 0.65);

  const batikUrl = src || getAssetUrl('/assets/batik_pattern_hd.jpg');

  return (
    <div 
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
              target.src = getAssetUrl('/assets/batik_vector_pattern.jpg');
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
