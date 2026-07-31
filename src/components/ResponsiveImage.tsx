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
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate srcSet from the base src path
  // e.g., /assets/nasi-lemak.jpg → /assets/nasi-lemak-400w.jpg, /assets/nasi-lemak-800w.jpg, etc.
  const basePath = src.replace(/\.[^.]+$/, '');
  const extension = src.match(/\.[^.]+$/)?.[0] || '.jpg';

  const widths = [400, 800, 1200, 1600];
  const srcSet = widths
    .map((w) => `${basePath}-${w}w${extension} ${w}w`)
    .join(', ');

  // Fallback src (original or smallest variant)
  const fallbackSrc = `${basePath}-400w${extension}`;

  useEffect(() => {
    // If the image is already cached, onLoad won't fire — check complete
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

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
        ref={imgRef}
        src={fallbackSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => setError(true)}
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
