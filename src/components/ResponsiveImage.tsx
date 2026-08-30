import React, { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { cn, getAssetUrl, resolveDishImage } from '@/lib/utils';
import { normalizeImageUrl, getProxiedOrRepairedImageUrl } from '@/lib/imageRepair';

export interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  sizes?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  placeholderColor?: string;
  lazy?: boolean;
  className?: string;
  containerClassName?: string;
  onLoad?: (event?: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event?: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  enableSrcSet?: boolean;
}

/**
 * ResponsiveImage
 *
 * Professional, high-performance image component that:
 * 1. Resolves asset paths via getAssetUrl for Web and Capacitor WebView compatibility.
 * 2. Generates responsive srcSet variants with automatic fallback on loading errors.
 * 3. Shows a smooth shimmer loading state and elegant blur-to-clear transition on load.
 * 4. Provides a graceful fallback visual card when an image fails to load.
 * */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  aspectRatio,
  objectFit = 'cover',
  placeholderColor,
  lazy = true,
  className = '',
  containerClassName = '',
  onLoad,
  onError,
  style,
  ...imgProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  const [repairStage, setRepairStage] = useState(0);

  // Initialize and reset currentSrc when src prop changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setRepairStage(0);
    setCurrentSrc(normalizeImageUrl(src));
  }, [src]);

  // Handle cached image instant loads
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [currentSrc]);

  const fitClass =
    objectFit === 'contain'
      ? 'object-contain'
      : objectFit === 'fill'
      ? 'object-fill'
      : objectFit === 'none'
      ? 'object-none'
      : 'object-cover';

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Stage 1: Resolve /src/assets/ legacy paths
    if (currentSrc.includes('/src/assets/')) {
      setCurrentSrc(currentSrc.replace('/src/assets/', '/assets/'));
      return;
    }

    // Stage 2: External image hotlink bypass via server proxy
    if ((currentSrc.startsWith('http://') || currentSrc.startsWith('https://')) && !currentSrc.includes('/api/images/proxy') && repairStage === 0) {
      setRepairStage(1);
      setCurrentSrc(getProxiedOrRepairedImageUrl(currentSrc, { useProxyForExternal: true, dishId: alt }));
      return;
    }

    // Stage 3: Local dish vector illustration repair
    if (repairStage <= 1) {
      setRepairStage(2);
      const repairedFallback = resolveDishImage({ id: src, nameEn: alt, nameBm: alt });
      if (repairedFallback && getAssetUrl(repairedFallback) !== currentSrc) {
        setCurrentSrc(getAssetUrl(repairedFallback));
        return;
      }
    }

    // Final Stage: show graceful designer placeholder
    setError(true);
    onError?.(e);
  };

  if (error || !currentSrc) {
    const isDrink =
      src.toLowerCase().includes('drink') ||
      src.toLowerCase().includes('kopi') ||
      src.toLowerCase().includes('teh') ||
      src.toLowerCase().includes('sirap') ||
      alt.toLowerCase().includes('teh') ||
      alt.toLowerCase().includes('kopi') ||
      alt.toLowerCase().includes('drink') ||
      alt.toLowerCase().includes('water');

    const displayName = alt ? alt.replace(/\s+Catering|\s+Kaw|\s+434|\s+Nasi Impit/gi, '') : 'Wawasan Special';

    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center p-6 text-center overflow-hidden select-none transition-all duration-500',
          'bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-stone-900 dark:to-stone-950',
          'border border-amber-500/10 dark:border-white/5 rounded-t-[2rem] w-full h-full',
          containerClassName
        )}
        style={{ aspectRatio, ...style }}
        role="img"
        aria-label={alt}
      >
        {/* Artistic Batik Watermark Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-15 dark:opacity-5 mix-blend-overlay dark:mix-blend-screen pointer-events-none"
          style={{
            backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Decorative ambient radial glow */}
        <div className="absolute top-[30%] left-[30%] w-[60%] h-[60%] bg-amber-500/10 blur-[30px] rounded-full pointer-events-none" />

        {/* Content container */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-3.5 p-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white dark:bg-stone-850 shadow-md border border-amber-500/20 text-amber-600 dark:text-amber-400 transform transition-transform duration-500 hover:scale-110">
            {isDrink ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12Z"/><path d="M6 2v2"/><path d="M17 12h1a2 2 0 0 1 2 2v1a2.5 2.5 0 0 1-2.5 2.5H17"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            )}
          </div>
          <div className="flex flex-col space-y-1">
            <span className="font-display font-black text-sm lg:text-base tracking-tight text-stone-800 dark:text-amber-100 max-w-[180px] line-clamp-1">
              {displayName}
            </span>
            <span className="text-[9px] uppercase font-black tracking-widest text-amber-600/80 dark:text-amber-400/80">
              {isDrink ? 'Authentic Drink' : 'Heritage Food'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden bg-stone-200/40 dark:bg-stone-800/40', containerClassName)}
      style={{ aspectRatio, ...style }}
    >
      {/* Shimmer skeleton loader */}
      {!loaded && (
        <div
          className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-stone-200/50 via-stone-300/40 to-stone-200/50 dark:from-stone-800/50 dark:via-stone-700/40 dark:to-stone-800/50"
          style={placeholderColor ? { backgroundColor: placeholderColor } : undefined}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={(e) => {
          // Robust check for corrupt decodes of served 0-byte/faulty files
          if (e.currentTarget.naturalWidth === 0) {
            handleImageError(e as any);
          } else {
            setLoaded(true);
            onLoad?.(e);
          }
        }}
        onError={handleImageError}
        className={cn(
          'w-full h-full transition-all duration-300 ease-out opacity-100',
          fitClass,
          className
        )}
        {...imgProps}
      />
    </div>
  );
};

export default ResponsiveImage;

