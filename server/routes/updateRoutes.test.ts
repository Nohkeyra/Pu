import { describe, it, expect } from 'vitest';
import { isAllowedApkUrl } from './updateRoutes.js';

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
