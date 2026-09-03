import React from 'react';

/**
 * Robust lazy import wrapper with exponential-backoff retries and 
 * automatic recovery from stale Vite chunks or network hiccups.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  chunkName: string = 'component'
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const storageKey = `wawasan_chunk_retry_${chunkName}`;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const module = await componentImport();
        // Clear recovery flag on success
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(storageKey);
        }
        return module;
      } catch (err: unknown) {
        const error = err as Error | undefined;
        console.warn(
          `[LazyRetry] Attempt ${attempt + 1}/${maxRetries + 1} to load "${chunkName}" failed:`,
          error?.message || error
        );

        if (attempt < maxRetries) {
          // Wait with exponential backoff: 350ms, 850ms
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1) + 100));
        } else {
          // All immediate retries exhausted.
          // Check if this looks like a chunk loading / Vite dynamic import failure
          const isChunkError =
            error?.message?.includes('Failed to fetch dynamically imported module') ||
            error?.message?.includes('dynamically imported') ||
            error?.message?.includes('Loading chunk') ||
            error?.name === 'TypeError';

          if (isChunkError && typeof window !== 'undefined') {
            const hasAutoReloaded = sessionStorage.getItem(storageKey);
            if (!hasAutoReloaded) {
              console.warn(
                `[LazyRetry] Stale chunk detected for "${chunkName}". Refreshing browser to fetch latest assets...`
              );
              sessionStorage.setItem(storageKey, 'true');
              window.location.reload();
              // Return an unresolved promise to prevent re-throwing while page reloads
              return new Promise<never>(() => {});
            }
          }

          throw error;
        }
      }
    }

    throw new Error(`Failed to load module ${chunkName}`);
  });
}
