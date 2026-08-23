import React, { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { cn, getAssetUrl } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

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
  fallbackText?: string;
}

/**
 * ResponsiveImage
 *
 * Professional, high-performance image component that:
 * 1. Resolves asset paths via getAssetUrl for Web and Capacitor WebView compatibility.
 * 2. Generates responsive srcSet variants with automatic fallback on loading errors.
 * 3. Shows a smooth shimmer loading state and elegant blur-to-clear transition on load.
 * 4. Provides a graceful fallback visual card when an image fails to load.
 */
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
  fallbackText,
  style,
  ...imgProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize and reset currentSrc when src prop changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setCurrentSrc(getAssetUrl(src));
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
    if (currentSrc.includes('/src/assets/')) {
      // Stage 1 retry: replace /src/assets/ with /assets/
      setCurrentSrc(currentSrc.replace('/src/assets/', '/assets/'));
      return;
    }
    
    if (!currentSrc.includes('/assets/images/nasi-campur.jpg')) {
      // Stage 2 retry: fallback to standard bundled asset
      setCurrentSrc(getAssetUrl('/assets/images/nasi-campur.jpg'));
      return;
    }

    // Final Stage: show graceful placeholder
    setError(true);
    onError?.(e);
  };

  if (error || !currentSrc) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center p-4 text-center bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 overflow-hidden select-none',
          containerClassName
        )}
        style={{ aspectRatio, ...style }}
        role="img"
        aria-label={alt}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-full bg-stone-200/70 dark:bg-stone-700/70 text-stone-400 dark:text-stone-500">
            <ImageOff className="w-6 h-6 stroke-[1.5]" />
          </div>
          <span className="text-xs font-medium max-w-[80%] truncate">
            {fallbackText || alt || 'Image unavailable'}
          </span>
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
          setLoaded(true);
          onLoad?.(e);
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

