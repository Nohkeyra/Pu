import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
    return item.image;
  }
  const id = (item?.id || '').toLowerCase();
  const name = `${item?.nameEn || ''} ${item?.nameBm || ''}`.toLowerCase();
  const category = (item?.category || '').toLowerCase();

  // Nasi
  if (id.includes('nasi_lemak') || name.includes('nasi lemak')) {
    return '/assets/dishes/vector/nasi_lemak.jpg';
  }
  if (id.includes('briyani') || id.includes('biryani') || name.includes('briyani') || name.includes('biryani') || name.includes('arab') || name.includes('tomato')) {
    return '/assets/dishes/vector/nasi_briyani.jpg';
  }
  if (id.includes('nasi') || name.includes('nasi')) {
    return '/assets/dishes/vector/nasi_lemak.jpg';
  }

  // Noodles
  if (id.includes('asam_laksa') || name.includes('asam laksa')) {
    return '/assets/dishes/vector/asam_laksa.jpg';
  }
  if (id.includes('laksa') || name.includes('laksa')) {
    return '/assets/dishes/vector/laksa_johor.jpg';
  }
  if (id.includes('mee_kari') || id.includes('curry_mee') || name.includes('mee kari') || name.includes('curry mee')) {
    return '/assets/dishes/vector/mee_kari.jpg';
  }
  if (name.includes('mee') || name.includes('bihun') || name.includes('kuey teow') || name.includes('maggi') || name.includes('noodle')) {
    return '/assets/dishes/vector/mee_kari.jpg';
  }

  // Proteins
  if (id.includes('asam_pedas') || name.includes('asam pedas') || name.includes('pari')) {
    return '/assets/dishes/vector/asam_pedas.jpg';
  }
  if (id.includes('keli') || name.includes('keli') || id.includes('ikan') || name.includes('ikan') || name.includes('fish') || name.includes('siakap') || name.includes('tenggiri')) {
    return '/assets/dishes/vector/ikan_keli.jpg';
  }
  if (id.includes('udang') || name.includes('udang') || id.includes('sambal_udang') || name.includes('sotong') || name.includes('seafood')) {
    return '/assets/dishes/vector/sambal_udang.jpg';
  }
  if (id.includes('kambing') || name.includes('kambing') || name.includes('mutton') || name.includes('lamb')) {
    return '/assets/dishes/vector/kari_kambing.jpg';
  }
  if (id.includes('rendang') || id.includes('daging') || name.includes('rendang') || name.includes('daging') || name.includes('beef')) {
    return '/assets/dishes/vector/rendang_daging.jpg';
  }
  if (id.includes('ayam') || id.includes('percik') || name.includes('ayam') || name.includes('chicken')) {
    return '/assets/dishes/vector/ayam_berempah.jpg';
  }

  // Others / Soups
  if (id.includes('soto') || name.includes('soto') || id.includes('sup') || name.includes('sup') || name.includes('soup')) {
    return '/assets/dishes/vector/soto_ayam.jpg';
  }
  if (id.includes('lontong') || name.includes('lontong') || id.includes('lodeh')) {
    return '/assets/dishes/vector/lontong.jpg';
  }
  if (id.includes('lemak') || name.includes('masak lemak') || name.includes('lemak cili') || name.includes('sayur') || name.includes('kobis') || name.includes('vegetable')) {
    return '/assets/dishes/vector/masak_lemak.jpg';
  }
  if (id.includes('roti') || id.includes('canai') || name.includes('roti') || name.includes('murtabak') || name.includes('bread')) {
    return '/assets/dishes/vector/roti_canai.jpg';
  }
  if (id.includes('pisang') || name.includes('pisang') || id.includes('gorengan') || name.includes('goreng')) {
    return '/assets/dishes/vector/pisang_goreng.jpg';
  }
  if (id.includes('rojak') || name.includes('rojak') || name.includes('salad')) {
    return '/assets/dishes/vector/rojak_singapore.jpg';
  }
  if (id.includes('kuih') || id.includes('currypuff') || id.includes('karipap') || id.includes('samosa') || name.includes('kuih') || name.includes('karipap') || name.includes('dessert') || name.includes('manis')) {
    return '/assets/dishes/vector/kuih_muih.jpg';
  }

  // Drinks
  if (id.includes('teh') || name.includes('teh') || name.includes('tea')) {
    return '/assets/dishes/vector/teh_tarik.jpg';
  }
  if (id.includes('kopi') || id.includes('nescafe') || id.includes('milo') || name.includes('kopi') || name.includes('nescafe') || name.includes('milo') || name.includes('coffee')) {
    return '/assets/dishes/vector/kopi_kampung.jpg';
  }
  if (id.includes('sirap') || id.includes('drink') || id.includes('kordial') || id.includes('mineral') || category === 'drink' || category === 'drinks' || name.includes('jus') || name.includes('air') || name.includes('juice') || name.includes('limau')) {
    return '/assets/dishes/vector/sirap_bandung.jpg';
  }

  // Ultimate fallback (nasi lemak)
  return '/assets/dishes/vector/nasi_lemak.jpg';
}
