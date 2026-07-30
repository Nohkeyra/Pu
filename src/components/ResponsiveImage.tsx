import { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { cn, getAssetUrl } from '@/lib/utils';

interface ResponsiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
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
 * Uses the original src as fallback, and adds srcSet for responsive variants
 * if they exist at /assets/{name}-{width}w.jpg.
 * 
 * If responsive variants are missing, the original image loads normally.
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
  const [useSrcSet, setUseSrcSet] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset states when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setUseSrcSet(true);
  }, [src]);

  const resolvedSrc = getAssetUrl(src);

  // Generate srcSet from the resolved src path
  // e.g., /assets/nasi-lemak.jpg → /assets/nasi-lemak-400w.jpg, /assets/nasi-lemak-800w.jpg, etc.
  const basePath = resolvedSrc.replace(/\.[^.]+$/, '');
  const extension = resolvedSrc.match(/\.[^.]+$/)?.[0] || '.jpg';

  const widths = [400, 800, 1200, 1600];
  const srcSet = useSrcSet
    ? widths.map((w) => `${basePath}-${w}w${extension} ${w}w`).join(', ')
    : undefined;

  useEffect(() => {
    // If the image is already cached, onLoad won't fire — check complete
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [resolvedSrc, useSrcSet]);

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
      {/* Placeholder / skeleton while loading */}
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: placeholderColor }}
        />
      )}
      <img
        key={useSrcSet ? 'srcset' : 'fallback'}
        ref={imgRef}
        src={resolvedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          if (useSrcSet) {
            console.warn(`Responsive variant load failed for: ${resolvedSrc}, falling back to original source.`);
            setUseSrcSet(false);
          } else {
            setError(true);
          }
        }}
        className={cn(
          'w-full h-full transition-opacity duration-500',
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
