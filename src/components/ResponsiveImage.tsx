import { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  sizes?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  placeholderColor?: string;
  lazy?: boolean;
  className?: string;
  containerClassName?: string;
  onLoad?: () => void;
}

/**
 * ResponsiveImage
 * 
 * Automatically generates srcset for images in /assets/.
 * Assumes responsive variants exist at /assets/{name}-{width}w.jpg.
 * 
 * Usage:
 *   <ResponsiveImage
 *     src="/assets/nasi-lemak.jpg"
 *     alt="Nasi Lemak"
 *     sizes="(max-width: 768px) 100vw, 50vw"
 *     className="rounded-2xl"
 *   />
 */
export default function ResponsiveImage({
  src,
  alt,
  sizes = '100vw',
  aspectRatio,
  objectFit = 'cover',
  placeholderColor = '#f5e8d0',
  lazy = true,
  className,
  containerClassName,
  onLoad,
  ...imgProps
}: ResponsiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [useSrcSet, setUseSrcSet] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state if primary src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setCurrentSrc(src);
    setUseSrcSet(true);
  }, [src]);

  // Check if image is already cached
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [currentSrc, useSrcSet]);

  // Generate srcSet for local responsive assets if applicable
  const isLocalAsset = src.startsWith('/assets/') || src.startsWith('assets/');
  const basePath = src.replace(/\.[^.]+$/, '');
  const extension = src.match(/\.[^.]+$/)?.[0] || '.jpg';

  const widths = [400, 800, 1200, 1600];
  const srcSet = isLocalAsset
    ? widths.map((w) => `${basePath}-${w}w${extension} ${w}w`).join(', ')
    : undefined;

  const handleImageError = () => {
    // If srcSet was enabled and failed on a specific device width candidate, disable srcSet and load exact src
    if (useSrcSet && isLocalAsset) {
      setUseSrcSet(false);
      return;
    }
    // If custom currentSrc failed, attempt original src before declaring error
    if (currentSrc !== src) {
      setCurrentSrc(src);
      setUseSrcSet(false);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-cream-dark/50 rounded-lg',
          containerClassName
        )}
        style={{ aspectRatio }}
      >
        <span className="text-stone text-sm">{alt}</span>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-cream-dark/30"
          style={{ backgroundColor: placeholderColor }}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        srcSet={useSrcSet && currentSrc === src ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={handleImageError}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          className
        )}
        {...imgProps}
      />
    </div>
  );
}
