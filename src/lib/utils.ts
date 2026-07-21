import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cache-busting helper for assets in the public folder (simplified to pass-through to avoid asset sync query string issues)
export function getAssetUrl(path: string): string {
  return path;
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

