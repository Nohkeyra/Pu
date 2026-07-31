import React, { useState, useEffect } from 'react';

interface TransparentLogoProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TransparentLogo: React.FC<TransparentLogoProps> = ({ src, alt, className, style }) => {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // If pixel is white or near-white, make it transparent
          if (r > 235 && g > 235 && b > 235) {
            data[i + 3] = 0;
          } else if (r > 210 && g > 210 && b > 210) {
            const factor = (255 - Math.max(r, g, b)) / (255 - 210);
            data[i + 3] = Math.floor(data[i + 3] * Math.min(1, Math.max(0, 1 - factor)));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setProcessedSrc(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error('Failed to process logo transparency:', e);
        setProcessedSrc(src);
      }
    };

    img.onerror = () => {
      setProcessedSrc(src);
    };
  }, [src]);

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
    />
  );
};

export default TransparentLogo;
