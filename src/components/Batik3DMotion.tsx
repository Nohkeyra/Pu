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
  style?: React.CSSProperties;
  alt?: string;
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
  style = {},
  alt = 'Batik Pattern Background',
}) => {
  const { rotateX, rotateY } = useDeviceMotion3D(maxRotation);
  
  // Subtle translation parallax for extra 3D depth
  const moveX = useTransform(rotateY, (rY) => rY * 0.7);
  const moveY = useTransform(rotateX, (rX) => -rX * 0.7);

  const batikUrl = getAssetUrl('/assets/batik_pattern.jpg');

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
          style={{
            rotateX,
            rotateY,
            x: moveX,
            y: moveY,
            scale: 1.45, // Scaled up even more to prevent any edge cutoff
            maskImage,
            WebkitMaskImage: maskImage,
            ...style,
          }}
          className={`absolute -inset-[15%] w-[130%] h-[130%] object-cover object-center filter transition-all duration-300 ease-out ${imgClassName}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: moveX,
            y: moveY,
            scale: 1.45, // Scaled up even more to prevent any edge cutoff
            backgroundImage: `url(${batikUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
            maskImage,
            WebkitMaskImage: maskImage,
            opacity,
            ...style,
          }}
          className={`absolute -inset-[15%] w-[130%] h-[130%] ${imgClassName}`}
        />
      )}
      {overlayClassName && <div className={overlayClassName} />}
    </div>
  );
};
