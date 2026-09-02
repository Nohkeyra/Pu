import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export { formatDateDisplay, formatDateTimeDisplay } from './dateUtils'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper for assets in the public folder (ensures correct root pathing across web routes and Capacitor)
export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  // Strip any accidental leading relative markers like "./" or "../"
  let cleanPath = path.replace(/^(\.\/|\.\.\/)+/, '');
  // Ensure leading slash for root pathing across nested routes (e.g. /order, /admin)
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }
  // Convert legacy internal source path /src/assets/ to public asset path /assets/
  if (cleanPath.startsWith('/src/assets/')) {
    cleanPath = cleanPath.replace('/src/assets/', '/assets/');
  }
  // If running under local file:// protocol (rare legacy WebView local file access)
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return `.${cleanPath}`;
  }
  // Append cache buster to force fresh loads of newly added assets
  const buster = 'v=1.3.43';
  if (cleanPath.includes('?')) {
    cleanPath = `${cleanPath}&${buster}`;
  } else {
    cleanPath = `${cleanPath}?${buster}`;
  }
  return cleanPath;
}

// Additional utility for consistent spacing
export function sectionId(id: string) {
  return `section-${id}`
}

// Format price consistently
export function formatPrice(price: number) {
  return `RM ${price.toFixed(2)}`
}

// Clean display helper for order reference / invoice number
export function getDisplayInvoiceNo(order?: { invoiceNo?: string; officialInvoiceNo?: string; id?: string } | null): string {
  if (!order) return 'ORDER';
  if (order.invoiceNo) return order.invoiceNo;
  if (order.officialInvoiceNo) return order.officialInvoiceNo;
  if (order.id) {
    if (order.id.length > 12) {
      return `RW ${order.id.substring(0, 5).toUpperCase()}`;
    }
    return order.id;
  }
  return 'ORDER';
}

/**
 * Safely copies text to the clipboard using the modern Clipboard API
 * with a reliable document.execCommand('copy') fallback if the modern
 * API is blocked (e.g. inside a sandboxed/non-focused iframe).
 */
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard API failed, attempting fallback:', err);
    }
  }

  // Fallback: document.execCommand('copy') via temporary textarea
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Position outside screen to avoid layout disturbance
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

/**
 * Safely converts any value to JSON string without throwing Uncaught TypeError
 * on circular structures, DOM elements, or custom objects.
 */
export function safeJsonStringify(value: unknown, space?: number | string): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      if (typeof val === 'object' && val !== null) {
        // Handle Firestore timestamp objects or objects with custom toDate
        if ('toDate' in val && typeof (val as { toDate?: unknown }).toDate === 'function') {
          return (val as { toDate: () => Date }).toDate().toISOString();
        }
        // Handle DOM nodes / HTML elements / window / synthetic events
        if (
          'nodeType' in val ||
          ('src' in val && 'width' in val && 'height' in val) ||
          (typeof window !== 'undefined' && (val === window || val instanceof HTMLElement))
        ) {
          return '[Object]';
        }
        // Guard against circular references
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    },
    space
  );
}


export function resolveDishImage(item: any): string {
  if (item?.image && typeof item.image === 'string' && item.image.trim()) {
    const imgStr = item.image.trim();
    if (!imgStr.includes('/photos/')) {
      return imgStr;
    }
  }

  const id = (item?.id || '').toLowerCase();
  const name = `${item?.nameEn || ''} ${item?.nameBm || ''}`.toLowerCase();
  const category = (item?.category || '').toLowerCase();

  // 1. Drinks Specific Matches (Vector Illustrated Look)
  if (category === 'drink' || category === 'drinks' || id.includes('drink') || name.includes('drink') || name.includes('milo') || name.includes('nescafe') || name.includes('kopi') || name.includes('teh') || name.includes('sirap') || name.includes('water') || name.includes('mineral') || name.includes('jus') || name.includes('air') || name.includes('asam jawa')) {
    if (id.includes('sirap_limau') || (name.includes('sirap') && name.includes('limau'))) {
      return '/assets/drinks/sirap_limau_vector.jpg';
    }
    if (id.includes('milo') || name.includes('milo')) {
      return '/assets/drinks/milo_vector.jpg';
    }
    if (id.includes('nescafe') || name.includes('nescafe') || id.includes('kopi') || name.includes('kopi') || name.includes('coffee')) {
      return '/assets/drinks/kopi_kampung_vector.jpg';
    }
    if (id.includes('sirap_bandung') || name.includes('bandung')) {
      return '/assets/drinks/sirap_bandung.jpg';
    }
    if (id.includes('jus') || name.includes('jus') || id.includes('oren') || name.includes('oren') || id.includes('peel_fresh') || id.includes('kordial')) {
      return '/assets/drinks/jus_oren_vector.jpg';
    }
    if (id.includes('asam_jawa') || name.includes('asam jawa')) {
      return '/assets/drinks/air_asam_jawa_vector.jpg';
    }
    if (id.includes('sirap') || name.includes('sirap')) {
      return '/assets/drinks/sirap_limau_vector.jpg';
    }
    if (id.includes('mineral') || name.includes('mineral') || id.includes('water') || name.includes('water') || id.includes('botol') || id.includes('tetra')) {
      return '/assets/drinks/mineral_water_vector.jpg';
    }
    if (id.includes('teh') || name.includes('teh') || name.includes('tea')) {
      return '/assets/drinks/teh_tarik.jpg';
    }
    return '/assets/drinks/teh_tarik.jpg';
  }

  // 2. Dish Specific Vector Illustrated Matches
  if (id.includes('boom') || name.includes('boom')) {
    return '/assets/dishes/vector/roti_boom.jpg';
  }
  if (id.includes('tosai') || name.includes('tosai') || name.includes('thosai')) {
    return '/assets/dishes/vector/tosai.jpg';
  }
  if (id.includes('mata_sapi') || name.includes('mata sapi') || name.includes('telur mata')) {
    return '/assets/dishes/vector/telur_mata_sapi.jpg';
  }
  if (id.includes('roti_canai') || name.includes('roti canai') || id.includes('roti_telur') || name.includes('roti telur') || id.includes('roti_sardin') || name.includes('roti sardin')) {
    return '/assets/dishes/vector/roti_canai.jpg';
  }
  if (id.includes('kuih') || name.includes('kuih') || name.includes('pisang_goreng') || name.includes('pisang')) {
    return '/assets/dishes/vector/kuih_muih.jpg';
  }
  if (id.includes('nasi_lemak') || name.includes('nasi lemak')) {
    return '/assets/dishes/vector/nasi_lemak.jpg';
  }
  if (id.includes('lontong') || name.includes('lontong') || id.includes('lodeh')) {
    return '/assets/dishes/vector/lontong.jpg';
  }
  if (id.includes('asam_pedas') || name.includes('asam pedas') || name.includes('pari')) {
    return '/assets/dishes/vector/asam_pedas.jpg';
  }
  if (id.includes('laksa_johor') || name.includes('laksa johor')) {
    return '/assets/dishes/vector/laksa_johor.jpg';
  }
  if (id.includes('asam_laksa') || name.includes('asam laksa')) {
    return '/assets/dishes/vector/asam_laksa.jpg';
  }
  if (id.includes('soto_ayam') || name.includes('soto ayam') || id.includes('mee_soto') || name.includes('soto')) {
    return '/assets/dishes/vector/soto_ayam.jpg';
  }
  if (id.includes('bihun') || name.includes('bihun') || name.includes('vermicelli')) {
    return '/assets/dishes/vector/bihun_goreng.jpg';
  }
  if (id.includes('kuey_teow') || name.includes('kuey teow') || name.includes('char kway teow')) {
    return '/assets/dishes/vector/kuey_teow.jpg';
  }
  if (id.includes('mee_goreng') || name.includes('mee goreng') || id.includes('maggi') || name.includes('maggi')) {
    return '/assets/dishes/vector/mee_goreng.jpg';
  }
  if (id.includes('mee_kari') || name.includes('mee kari') || name.includes('curry noodle')) {
    return '/assets/dishes/vector/mee_kari.jpg';
  }
  if (id.includes('mee') || name.includes('mee')) {
    return '/assets/dishes/vector/mee_goreng.jpg';
  }
  if (id.includes('kari_kambing') || name.includes('kari kambing')) {
    return '/assets/dishes/vector/kari_kambing.jpg';
  }
  if (id.includes('rendang') || name.includes('rendang') || id.includes('daging')) {
    return '/assets/dishes/vector/rendang_daging.jpg';
  }
  if (id.includes('udang') || name.includes('udang') || id.includes('sotong') || name.includes('sotong')) {
    return '/assets/dishes/vector/sambal_udang.jpg';
  }
  if (id.includes('ikan_keli') || name.includes('ikan keli') || name.includes('keli')) {
    return '/assets/dishes/vector/ikan_keli.jpg';
  }
  if (id.includes('masak_lemak') || name.includes('masak lemak')) {
    return '/assets/dishes/vector/masak_lemak.jpg';
  }
  if (id.includes('ayam_berempah') || name.includes('ayam berempah') || name.includes('ayam goreng')) {
    return '/assets/dishes/vector/ayam_berempah.jpg';
  }
  if (id.includes('briyani') || name.includes('briyani') || id.includes('nasi_minyak') || id.includes('nasi_tomato')) {
    return '/assets/dishes/vector/nasi_briyani.jpg';
  }

  // Fallback vector image
  return '/assets/dishes/vector/nasi_lemak.jpg';
}
