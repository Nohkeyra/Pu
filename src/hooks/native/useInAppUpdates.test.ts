import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppVersionConfig } from '@/services/updateService';

const state = vi.hoisted(() => ({
  writes: [] as Array<{ index: number; value: unknown }>,
  index: 0,
  fetchLatestAppVersion: vi.fn(),
  getInstalledAppInfo: vi.fn(),
  isUpdateRequired: vi.fn(),
}));
vi.mock('react', () => ({
  useState: <T,>(initial: T) => {
    const index = state.index++;
    return [initial, (value: T) => state.writes.push({ index, value })];
  },
  useEffect: () => {},
  useCallback: <T,>(callback: T) => callback,
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/network', () => ({ Network: { getStatus: vi.fn() } }));
vi.mock('@/services/updateService', () => ({
  CURRENT_APP_VERSION: '1.0.0',
  CURRENT_BUILD_NUMBER: 1,
  fetchLatestAppVersion: state.fetchLatestAppVersion,
  getInstalledAppInfo: state.getInstalledAppInfo,
  isUpdateRequired: state.isUpdateRequired,
  subscribeToAppUpdates: vi.fn(),
}));

import { useInAppUpdates } from './useInAppUpdates';

const published: AppVersionConfig = {
  latestVersion: '1.0.1', minVersion: '1.0.0', buildNumber: 2,
  apkUrl: 'https://example.invalid/release.apk', releaseNotes: ['Fixture'],
  forceUpdate: false, updatedAt: '2026-11-28T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  state.index = 0;
  state.writes.length = 0;
  state.fetchLatestAppVersion.mockResolvedValue(published);
  state.getInstalledAppInfo.mockResolvedValue({ version: '1.0.0', buildNumber: 1 });
  state.isUpdateRequired.mockReturnValue({ hasUpdate: true, isForce: false });
});

describe('manual update notification', () => {
  it('stores the actual published config before opening the modal without a real-time snapshot', async () => {
    const result = await useInAppUpdates().checkNow();
    expect(result).toEqual({ hasUpdate: true, config: published });
    const configWrite = state.writes.findIndex(write => write.value === published);
    const modalWrite = state.writes.findIndex(write => write.index === 3 && write.value === true);
    expect(configWrite).toBeGreaterThanOrEqual(0);
    expect(modalWrite).toBeGreaterThan(configWrite);
  });

  it('does not open an update modal for an unavailable release', async () => {
    state.fetchLatestAppVersion.mockResolvedValue({ ...published, latestVersion: '0.0.0', apkUrl: '' });
    await expect(useInAppUpdates().checkNow()).rejects.toThrow('Published release information');
    expect(state.writes.some(write => write.index === 3 && write.value === true)).toBe(false);
  });
});
