import { getApiUrl } from '@/lib/api';

export const measureDbLatency = async () => {
  const start = performance.now();
  try {
    const response = await fetch(getApiUrl('/api/admin/next-invoice-number'), {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    await response.json();
    return Math.round(performance.now() - start);
  } catch (err) {
    console.error('Latency measurement failed:', err);
    return -1;
  }
};

export const runDiagnostics = async () => {
  const results = {
    api: false,
    db: false,
    latency: 0
  };

  try {
    const start = performance.now();
    const response = await fetch(getApiUrl('/api/health'));
    results.api = response.ok;
    results.latency = Math.round(performance.now() - start);
    
    const dbLatency = await measureDbLatency();
    results.db = dbLatency > 0;
  } catch (err) {
    console.error('Diagnostics failed:', err);
  }

  return results;
};
