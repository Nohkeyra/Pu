import { getAssetUrl, cn } from '@/lib/utils';

export interface WawasanLoaderProps {
  size?: number;
  className?: string;
}

export default function WawasanLoader({ size = 64, className }: WawasanLoaderProps) {
  return (
    <img
      src={getAssetUrl('/wawasan_logo_pack.svg')}
      alt="Loading"
      draggable={false}
      className={cn('object-contain pointer-events-none select-none', className)}
      style={{ width: size, height: size * (600 / 1000), background: 'transparent' }}
    />
  );
}
