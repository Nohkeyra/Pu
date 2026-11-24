import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import updateRoutes, { isAllowedApkUrl, verifyPublishedRelease } from './updateRoutes.js';
import { getFirestore } from '../firebaseAdmin.js';

describe('isAllowedApkUrl', () => {
  it('accepts the asset URL the release workflow publishes', () => {
    expect(
      isAllowedApkUrl('https://github.com/Nohkeyra/Pu/releases/download/v1.3.141/app-release-signed.apk')
    ).toBe(true);
  });

  it('rejects other hosts, repositories, schemes and file types', () => {
    const bad = [
      'https://evil.example/Nohkeyra/Pu/releases/download/v1/app.apk',
      'https://github.com/Attacker/Pu/releases/download/v1/app.apk',
      'https://github.com/Nohkeyra/Other/releases/download/v1/app.apk',
      'http://github.com/Nohkeyra/Pu/releases/download/v1/app.apk',
      'https://github.com/Nohkeyra/Pu/releases/download/v1/app.zip',
      'https://github.com.evil.example/Nohkeyra/Pu/releases/download/v1/app.apk',
      'https://user:pw@github.com/Nohkeyra/Pu/releases/download/v1/app.apk',
      'https://github.com:8443/Nohkeyra/Pu/releases/download/v1/app.apk',
      'https://github.com/Nohkeyra/Pu/releases/download/../../../../Attacker/x/app.apk',
      'javascript:alert(1)',
      'not a url',
      '',
    ];
    for (const url of bad) expect(isAllowedApkUrl(url), url).toBe(false);
  });
});

describe('release asset verification', () => {
  const apk = 'https://github.com/Nohkeyra/Pu/releases/download/v1.3.141/app-release-signed.apk';
  const asset = { state: 'uploaded', size: 1024, browser_download_url: apk };
  const fixture = { tag_name: 'v1.3.141', draft: false, prerelease: false, assets: [asset] };
  const mock = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it('accepts only uploaded matching stable release assets', async () => {
    expect(await verifyPublishedRelease('1.3.141', apk, '', mock(fixture))).toBe('verified');
    expect(await verifyPublishedRelease('1.3.142', apk, '', mock(fixture))).toBe('missing');
    expect(await verifyPublishedRelease('1.3.141', apk, '', mock({ ...fixture, draft: true }))).toBe('missing');
    expect(await verifyPublishedRelease('1.3.141', apk, '', mock({ ...fixture, assets: [] }))).toBe('missing');
    expect(await verifyPublishedRelease('1.3.141', apk, 'https://example.com/bundle.zip', mock(fixture))).toBe('missing');
    expect(await verifyPublishedRelease('1.3.141', apk, '', mock({}, 503))).toBe('unavailable');
  });
});

describe('GET /api/app-version read-only behavior', () => {
  let server: Server | null = null;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = null;
    }
  });

  it('performs zero Firestore .set() writes on GET even when stored version is outdated', async () => {
    const db = getFirestore();
    await db.collection('app_config').doc('version').set({ latestVersion: '1.0.0', apkUrl: 'https://github.com/Nohkeyra/Pu/releases/download/v1.0.0/app-release-signed.apk', buildNumber: 100 });

    const originalCollection = db.collection.bind(db);
    const setSpy = vi.fn();
    vi.spyOn(db, 'collection').mockImplementation(((name: string) => {
      if (name !== 'app_config') return originalCollection(name);
      const col = originalCollection(name);
      const originalDoc = col.doc.bind(col);
      return {
        ...col,
        doc: (docId: string) => {
          const ref = originalDoc(docId);
          return Object.assign(Object.create(Object.getPrototypeOf(ref)), ref, {
            get: ref.get.bind(ref),
            set: setSpy,
          });
        },
      };
    }) as typeof db.collection);

    const app = express();
    app.use('/api', updateRoutes);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const port = (server.address() as { port: number }).port;

    const res = await fetch(`http://127.0.0.1:${port}/api/app-version`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // Never advertise a build-time version over the last published version.
    expect(json.latestVersion).toBe('1.0.0');
    expect(json.apkUrl).toContain('/v1.0.0/');
    expect(setSpy).not.toHaveBeenCalled();
  });
});
