import { describe, expect, it, vi, afterEach } from 'vitest';
import dns from 'dns';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  isSafeUrl,
  getSafeLocalImagePath,
  getLocalFallbackImagePath,
  isAllowedReferer,
  antiHotlinkGuard,
} from './imageRoutes.js';

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

describe('antiHotlinkGuard and same-host Cloud Run validation', () => {
  it('allows same-host Cloud Run Referer/Origin while rejecting third-party .run.app hosts', () => {
    const cloudRunHost = 'ais-pre-o564njtvfdbrpiugzt7bjb-52752730077.asia-southeast1.run.app';
    expect(isAllowedReferer(`https://${cloudRunHost}/order`, undefined, cloudRunHost)).toBe(true);
    expect(isAllowedReferer(undefined, `https://${cloudRunHost}`, `${cloudRunHost}:8080`)).toBe(true);
    expect(isAllowedReferer(`https://${cloudRunHost}/order`, undefined)).toBe(false);
    expect(isAllowedReferer('https://attacker-app.a.run.app/steal.html', undefined, cloudRunHost)).toBe(false);
    expect(isAllowedReferer('https://evil.example.com/', undefined, cloudRunHost)).toBe(false);
  });

  it('passes same-host asset requests through middleware and blocks foreign hotlinks with 403', () => {
    const cloudRunHost = 'ais-pre-o564njtvfdbrpiugzt7bjb-52752730077.asia-southeast1.run.app';
    const next = vi.fn();
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { this.statusCode = code; return this; },
      send(payload: string) { this.body = payload; return this; },
    };

    antiHotlinkGuard(
      {
        path: '/assets/heritage/batik_vector_pattern.jpg',
        hostname: cloudRunHost,
        headers: { referer: `https://${cloudRunHost}/`, host: cloudRunHost },
      } as never,
      res as never,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);

    const blockedNext = vi.fn();
    antiHotlinkGuard(
      {
        path: '/assets/heritage/batik_vector_pattern.jpg',
        hostname: cloudRunHost,
        headers: { referer: 'https://other-service.a.run.app/', host: cloudRunHost },
      } as never,
      res as never,
      blockedNext
    );
    expect(blockedNext).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('PROTECTED ASSET');
  });
});
