import { describe, expect, it, vi, afterEach } from 'vitest';
import dns from 'dns';
import { isSafeUrl } from './imageRoutes.js';

describe('Image proxy address pinning preflight', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects private address even if DNS also returns public addresses', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ] as never);
    expect((await isSafeUrl('https://example.org/photo.jpg')).safe).toBe(false);
  });

  it('returns an explicit validated address to pin the outgoing socket', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
    ] as never);
    const result = await isSafeUrl('https://example.org/photo.jpg');
    expect(result.safe).toBe(true);
    expect(result.resolvedAddress).toBe('8.8.8.8');
  });

  it('rejects documentation, protocol, and benchmarking address ranges', async () => {
    for (const address of ['192.0.2.7', '198.51.100.24', '203.0.113.5', '198.18.0.4', '2001:db8::1', '::ffff:7f00:1']) {
      const url = `https://[${address}]/photo.jpg`;
      const result = await isSafeUrl(address.includes(':') ? url : `https://${address}/photo.jpg`);
      expect(result.safe, address).toBe(false);
    }
  });

  it('rejects loopback and URL credentials without DNS access', async () => {
    expect((await isSafeUrl('http://127.0.0.1/private')).safe).toBe(false);
    expect((await isSafeUrl('https://user:password@example.org/photo.jpg')).safe).toBe(false);
  });
});
