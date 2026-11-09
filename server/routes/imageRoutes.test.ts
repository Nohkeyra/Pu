import { describe, expect, it, vi, afterEach } from 'vitest';
import dns from 'dns';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isSafeUrl, getSafeLocalImagePath, getLocalFallbackImagePath } from './imageRoutes.js';

describe('Image proxy address pinning preflight', () => {
  afterEach(() => vi.restoreAllMocks());

  it('serves dist-only runtime assets while retaining path confinement', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'pu-runtime-assets-'));
    try {
      const assets = path.join(directory, 'dist', 'assets');
      await mkdir(assets, { recursive: true });
      await writeFile(path.join(assets, 'test.jpg'), 'local-fixture');
      await writeFile(path.join(directory, 'outside.jpg'), 'not-public');
      await symlink(path.join(directory, 'outside.jpg'), path.join(assets, 'escape.jpg'));
      vi.spyOn(process, 'cwd').mockReturnValue(directory);
      expect(await getSafeLocalImagePath('/assets/test.jpg')).toBe(path.join(assets, 'test.jpg'));
      expect(await getSafeLocalImagePath('/assets/escape.jpg')).toBeNull();
      expect(await getSafeLocalImagePath('/assets/../outside.jpg')).toBeNull();
      expect(getLocalFallbackImagePath('ayam')).toMatch(/dist\/assets\//);
    } finally {
      vi.restoreAllMocks();
      await rm(directory, { recursive: true, force: true });
    }
  });

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
