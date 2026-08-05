import React, { useState, useEffect, useRef } from 'react';

export interface TransparentLogoProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
  threshold?: number; // Brightness threshold for white background removal (0-255, default: 225)
  smoothing?: number; // Smooth edge alpha blending range (default: 35)
}

// In-memory cache to avoid re-processing the same image URL
const processedLogoCache = new Map<string, string>();

export const TransparentLogo: React.FC<TransparentLogoProps> = ({
  src,
  alt,
  className = '',
  style,
  onError,
  threshold = 225,
  smoothing = 35,
}) => {
  const cacheKey = `${src}_t${threshold}_s${smoothing}`;
  const [processedSrc, setProcessedSrc] = useState<string>(
    processedLogoCache.get(cacheKey) || src
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(!processedLogoCache.has(cacheKey));
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!src) return;

    if (
      src.toLowerCase().endsWith('.png') || 
      src.toLowerCase().endsWith('.svg') || 
      src.toLowerCase().includes('.png') || 
      src.toLowerCase().includes('.svg') || 
      src.toLowerCase().includes('data:image/png') ||
      src.toLowerCase().includes('data:image/svg+xml')
    ) {
      setProcessedSrc(src);
      setIsProcessing(false);
      return;
    }

    if (processedLogoCache.has(cacheKey)) {
      setProcessedSrc(processedLogoCache.get(cacheKey)!);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const processImage = (imageObj: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        const w = imageObj.naturalWidth || imageObj.width || 400;
        const h = imageObj.naturalHeight || imageObj.height || 400;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          if (isMounted.current) {
            setProcessedSrc(src);
            setIsProcessing(false);
          }
          return;
        }

        ctx.drawImage(imageObj, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const minThreshold = Math.max(0, threshold - smoothing);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const currentAlpha = data[i + 3];

          if (currentAlpha === 0) continue;

          // Calculate perceived brightness (luminance)
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          // Calculate color saturation variance
          const saturationDiff = Math.max(r, g, b) - Math.min(r, g, b);

          // Check if pixel is white or near-white light grey/off-white (low saturation, high brightness)
          if (brightness >= threshold && saturationDiff < 35) {
            // Completely transparent background
            data[i + 3] = 0;
          } else if (brightness > minThreshold && saturationDiff < 45) {
            // Smooth edge anti-aliasing alpha transition
            const alphaFactor = (threshold - brightness) / (threshold - minThreshold);
            const blendedAlpha = Math.floor(currentAlpha * Math.max(0, Math.min(1, alphaFactor)));
            data[i + 3] = blendedAlpha;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');

        processedLogoCache.set(cacheKey, transparentDataUrl);

        if (isMounted.current) {
          setProcessedSrc(transparentDataUrl);
          setIsProcessing(false);
        }
      } catch (err) {
        console.warn('TransparentLogo canvas processing fallback:', err);
        if (isMounted.current) {
          setProcessedSrc(src);
          setIsProcessing(false);
        }
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      processImage(img);
    };

    img.onerror = () => {
      // Try fallback without crossOrigin set if CORS blocked local/cached asset
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        processImage(fallbackImg);
      };
      fallbackImg.onerror = () => {
        if (isMounted.current) {
          setProcessedSrc(src);
          setIsProcessing(false);
          onError?.();
        }
      };
      fallbackImg.src = src;
    };

    img.src = src;
  }, [src, threshold, smoothing, cacheKey, onError]);

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={`${className} ${isProcessing ? 'opacity-80 transition-opacity duration-200' : 'opacity-100'}`}
      style={style}
      referrerPolicy="no-referrer"
      onError={onError}
    />
  );
};

export default TransparentLogo;

