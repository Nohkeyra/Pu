import React from 'react';
import { cn } from '@/lib/utils';

export interface BungaRayaSpinnerProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  speed?: 'slow' | 'normal' | 'fast';
  showPulseGlow?: boolean;
}

/**
 * BungaRayaSpinner
 * An authentic 5-petal Malaysian Hibiscus (Bunga Raya) outline loading spinner.
 * Features delicate petal curves, vein accents, and central stamen details with smooth continuous spinning.
 */
export const BungaRayaSpinner: React.FC<BungaRayaSpinnerProps> = ({
  className,
  size,
  speed = 'normal',
  showPulseGlow = true,
  style,
  ...props
}) => {
  const speedClass = 
    speed === 'slow' ? 'duration-1000' :
    speed === 'fast' ? 'duration-500' :
    'duration-700';

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={size ? { width: size, height: size } : undefined}>
      {showPulseGlow && (
        <span 
          className="absolute inset-0 rounded-full bg-amber-500/15 dark:bg-amber-400/20 blur-md animate-pulse pointer-events-none scale-125"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full animate-spin text-current",
          speedClass
        )}
        style={style}
        role="status"
        aria-label="Memuatkan..."
        {...props}
      >
        <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* 5 Organic Hibiscus Petals rotated symmetrically at 72° increments */}
          {[0, 72, 144, 216, 288].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              {/* Petal Outer Contour with organic subtle ruffle */}
              <path
                d="M 50 47 C 41 43, 28 34, 29 20 C 29.8 11, 40.5 7, 50 11.5 C 59.5 7, 70.2 11, 71 20 C 72 34, 59 43, 50 47 Z"
                strokeWidth="2.2"
                fill="currentColor"
                fillOpacity="0.08"
              />
              {/* Secondary Petal Edge Ruffle */}
              <path
                d="M 38 14 Q 50 17.5 62 14"
                strokeWidth="1.2"
                strokeOpacity="0.45"
              />
              {/* Center Vein Accent */}
              <path
                d="M 50 44 Q 50 29 50 18"
                strokeWidth="1.4"
                strokeOpacity="0.75"
              />
              {/* Radiating Stamen Filament & Anther */}
              <path
                d="M 50 46 L 50 35"
                strokeWidth="1.6"
              />
              <circle cx="50" cy="33.5" r="2" fill="currentColor" stroke="none" />
            </g>
          ))}

          {/* Central Hibiscus Eye & Stigma Core */}
          <circle cx="50" cy="50" r="5.5" strokeWidth="2" fill="currentColor" fillOpacity="0.25" />
          <circle cx="50" cy="50" r="2.2" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </div>
  );
};

export default BungaRayaSpinner;
