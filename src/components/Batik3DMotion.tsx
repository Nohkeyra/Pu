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
            scale: 1.12, // Scaled slightly to prevent edge cutoff during 3D tilt
            maskImage,
            WebkitMaskImage: maskImage,
            ...style,
          }}
          className={`w-full h-full object-cover object-center filter transition-all duration-300 ease-out ${imgClassName}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: moveX,
            y: moveY,
            scale: 1.15,
            backgroundImage: `url(${batikUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
            maskImage,
            WebkitMaskImage: maskImage,
            opacity,
            ...style,
          }}
          className={`w-full h-full ${imgClassName}`}
        />
      )}
      {overlayClassName && <div className={overlayClassName} />}
    </div>
  );
};
