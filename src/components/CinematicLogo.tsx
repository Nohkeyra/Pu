import React from 'react';
import { motion } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useDeviceMotion3D } from '@/hooks/useDeviceMotion3D';

interface CinematicLogoProps {
  className?: string;
  sizeClassName?: string;
}

export const CinematicLogo: React.FC<CinematicLogoProps> = ({
  className = '',
  sizeClassName = 'w-56 h-56',
}) => {
  const { rotateX, rotateY } = useDeviceMotion3D(20);

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Ambient glowing backlight pulse */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        className="absolute w-64 h-64 bg-sunshine/20 rounded-full blur-2xl pointer-events-none"
      />

      {/* 3D Motion Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 14 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative flex items-center justify-center ${sizeClassName} z-10`}
      >
        {/* Soft depth shadow layer */}
        <div
          className="absolute inset-4 rounded-full bg-black/10 blur-md pointer-events-none"
          style={{ transform: 'translateZ(-20px)' }}
        />

        {/* Floating 3D Logo Image */}
        <img
          src={getAssetUrl('/assets/wawasan_logo.jpg')}
          alt="Pak Usop Catering Logo"
          className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl select-none"
          style={{ transform: 'translateZ(35px)' }}
        />

        {/* Specular sheen layer */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none opacity-40"
          style={{ transform: 'translateZ(50px)' }}
        />
      </motion.div>
    </div>
  );
};

export default CinematicLogo;
