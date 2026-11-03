import { getAssetUrl } from '@/lib/utils';

/** Decorative Wawasan flower in reserved document space, never over form controls. */
export default function CustomerPageFloral() {
  return (
    <div className="customer-page-floral" aria-hidden="true">
      <img
        className="customer-page-floral__art"
        src={getAssetUrl('/assets/heritage/wawasan-batik-flower.svg')}
        alt=""
        draggable={false}
        loading="lazy"
      />
    </div>
  );
}
