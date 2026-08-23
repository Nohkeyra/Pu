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
    return '/assets/images/nasi_lemak_drawn_1786678078469.jpg';
  }
  if (id.includes('briyani') || id.includes('biryani') || name.includes('briyani') || name.includes('biryani') || name.includes('arab') || name.includes('tomato')) {
    return '/assets/images/nasi_briyani_drawn_1786969169870.jpg';
  }
  if (id.includes('nasi') || name.includes('nasi')) {
    return '/assets/images/nasi_lemak_drawn_1786678078469.jpg';
  }

  // Noodles
  if (id.includes('asam_laksa') || name.includes('asam laksa')) {
    return '/assets/images/asam_laksa_drawn_1786969613303.jpg';
  }
  if (id.includes('laksa') || name.includes('laksa')) {
    return '/assets/images/laksa_johor_drawn_1786969106862.jpg';
  }
  if (id.includes('mee_kari') || id.includes('curry_mee') || name.includes('mee kari') || name.includes('curry mee')) {
    return '/assets/images/mee_kari_drawn_1786969128509.jpg';
  }
  if (name.includes('mee') || name.includes('bihun') || name.includes('kuey teow') || name.includes('maggi') || name.includes('noodle')) {
    return '/assets/images/mee_kari_drawn_1786969128509.jpg';
  }

  // Proteins
  if (id.includes('asam_pedas') || name.includes('asam pedas') || name.includes('pari')) {
    return '/assets/images/asam_pedas_drawn_1786678089136.jpg';
  }
  if (id.includes('keli') || name.includes('keli') || id.includes('ikan') || name.includes('ikan') || name.includes('fish') || name.includes('siakap') || name.includes('tenggiri')) {
    return '/assets/images/ikan_keli_drawn_1786969559146.jpg';
  }
  if (id.includes('udang') || name.includes('udang') || id.includes('sambal_udang') || name.includes('sotong') || name.includes('seafood')) {
    return '/assets/images/sambal_udang_drawn_1786969546168.jpg';
  }
  if (id.includes('kambing') || name.includes('kambing') || name.includes('mutton') || name.includes('lamb')) {
    return '/assets/images/kari_kambing_drawn_1786969139262.jpg';
  }
  if (id.includes('rendang') || id.includes('daging') || name.includes('rendang') || name.includes('daging') || name.includes('beef')) {
    return '/assets/images/rendang_daging_drawn_1786678134956.jpg';
  }
  if (id.includes('ayam') || id.includes('percik') || name.includes('ayam') || name.includes('chicken')) {
    return '/assets/images/ayam_berempah_drawn_1786678122149.jpg';
  }

  // Others / Soups
  if (id.includes('soto') || name.includes('soto') || id.includes('sup') || name.includes('sup') || name.includes('soup')) {
    return '/assets/images/soto_ayam_drawn_1786678098460.jpg';
  }
  if (id.includes('lontong') || name.includes('lontong') || id.includes('lodeh')) {
    return '/assets/images/lontong_drawn_1786678109750.jpg';
  }
  if (id.includes('lemak') || name.includes('masak lemak') || name.includes('lemak cili') || name.includes('sayur') || name.includes('kobis') || name.includes('vegetable')) {
    return '/assets/images/masak_lemak_drawn_1786969572016.jpg';
  }
  if (id.includes('roti') || id.includes('canai') || name.includes('roti') || name.includes('murtabak') || name.includes('bread')) {
    return '/assets/images/roti_canai_drawn_1786969584576.jpg';
  }
  if (id.includes('pisang') || name.includes('pisang') || id.includes('gorengan') || name.includes('goreng')) {
    return '/assets/images/pisang_goreng_drawn_1786969603197.jpg';
  }
  if (id.includes('rojak') || name.includes('rojak') || name.includes('salad')) {
    return '/assets/images/rojak_singapore_drawn_1786969151162.jpg';
  }
  if (id.includes('kuih') || id.includes('currypuff') || id.includes('karipap') || id.includes('samosa') || name.includes('kuih') || name.includes('karipap') || name.includes('dessert') || name.includes('manis')) {
    return '/assets/images/kuih_muih_drawn_1786678145689.jpg';
  }

  // Drinks
  if (id.includes('teh') || name.includes('teh') || name.includes('tea')) {
    return '/assets/images/teh_tarik_drawn_1786678155597.jpg';
  }
  if (id.includes('kopi') || id.includes('nescafe') || id.includes('milo') || name.includes('kopi') || name.includes('nescafe') || name.includes('milo') || name.includes('coffee')) {
    return '/assets/images/kopi_kampung_drawn_1786678168694.jpg';
  }
  if (id.includes('sirap') || id.includes('drink') || id.includes('kordial') || id.includes('mineral') || category === 'drink' || category === 'drinks' || name.includes('jus') || name.includes('air') || name.includes('juice') || name.includes('limau')) {
    return '/assets/images/sirap_bandung_drawn_1786678177483.jpg';
  }

  // Ultimate fallback (nasi lemak)
  return '/assets/images/nasi_lemak_drawn_1786678078469.jpg';
}
