import { describe, it, expect } from 'vitest';
import { compareVersions, isUpdateRequired, type AppVersionConfig } from './updateService';

// F-TEST (audit 2026-08-11): compareVersions/isUpdateRequired decide whether
// the app force-updates a customer or silently offers an optional update.
// A wrong result here either traps a customer in an update loop (isForce
// wrongly true) or lets them run an unsupported version silently (isForce
// wrongly false) — high real-world cost if it regresses, and both functions
// are pure (no Firebase/Capacitor calls), so they're cheap and safe to
// cover directly.

describe('compareVersions', () => {
  it('returns 1 when v1 is newer', () => {
    expect(compareVersions('1.2.5', '1.2.4')).toBe(1);
  });

  it('returns -1 when v1 is older', () => {
    expect(compareVersions('1.2.4', '1.2.5')).toBe(-1);
  });

  it('returns 0 when versions are equal', () => {
    expect(compareVersions('1.2.5', '1.2.5')).toBe(0);
  });

  it('handles a "v" prefix the same as without it', () => {
    expect(compareVersions('v1.3.0', '1.2.9')).toBe(1);
  });

  it('coerces a two-part version (e.g. "1.2") by treating it as 1.2.0', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2', '1.1.9')).toBe(1);
  });

  it('falls back to 0.0.0 for a completely invalid version string, rather than throwing', () => {
    expect(() => compareVersions('not-a-version', 'also-not-a-version')).not.toThrow();
    expect(compareVersions('not-a-version', 'also-not-a-version')).toBe(0);
  });

  it('treats an invalid version as older than any valid version', () => {
    expect(compareVersions('not-a-version', '1.0.0')).toBe(-1);
  });
});

describe('isUpdateRequired', () => {
  const baseConfig: AppVersionConfig = {
    latestVersion: '1.3.0',
    minVersion: '1.2.0',
    buildNumber: 130,
    apkUrl: 'https://example.com/app.apk',
    releaseNotes: [],
    forceUpdate: false,
    updatedAt: new Date().toISOString(),
  };

  it('flags an optional update when latestVersion is newer than current, but current still meets minVersion', () => {
    const result = isUpdateRequired(baseConfig, '1.2.5');
    expect(result.hasUpdate).toBe(true);
    expect(result.isForce).toBe(false);
  });

  it('does not flag an update when current already matches latestVersion', () => {
    const result = isUpdateRequired(baseConfig, '1.3.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.isForce).toBe(false);
  });

  it('forces an update when current version is below minVersion, even if forceUpdate flag is false', () => {
    const result = isUpdateRequired(baseConfig, '1.1.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.isForce).toBe(true);
  });

  it('forces an update when forceUpdate flag is explicitly true, even if current meets minVersion', () => {
    const forcedConfig: AppVersionConfig = { ...baseConfig, forceUpdate: true };
    const result = isUpdateRequired(forcedConfig, '1.2.9');
    expect(result.isForce).toBe(true);
  });

  it('does not flag hasUpdate when current is already newer than latestVersion (e.g. a beta ahead of remote config)', () => {
    const result = isUpdateRequired(baseConfig, '1.4.0');
    expect(result.hasUpdate).toBe(false);
  });
});
