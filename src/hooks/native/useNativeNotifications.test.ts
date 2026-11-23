import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  listeners: new Map<number, { name: string; callback: (...args: unknown[]) => void }>(),
  nextId: 0,
  push: {
    checkPermissions: vi.fn(), requestPermissions: vi.fn(), createChannel: vi.fn(),
    addListener: vi.fn(), register: vi.fn(), removeAllListeners: vi.fn(),
  },
}));
vi.mock('react', () => ({
  useEffect: (callback: () => void | (() => void)) => state.effects.push(callback),
  useRef: <T,>(value: T) => ({ current: value }),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: state.push }));
vi.mock('@capacitor-community/fcm', () => ({ FCM: { getToken: vi.fn().mockResolvedValue({ token: 'local-token' }) } }));
vi.mock('@/firebaseConfig', () => ({ auth: { currentUser: null }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), setDoc: vi.fn() }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: () => () => {} }));
vi.mock('@/context/SettingsContext', () => ({ useSettings: () => ({ notificationsEnabled: true }) }));
vi.mock('@/lib/api', () => ({ getApiUrl: (path: string) => path }));
vi.mock('@/lib/preferences', () => ({ getSecureItem: async () => null }));
import { useNativeNotifications } from './useNativeNotifications';

beforeEach(() => {
  vi.clearAllMocks();
  state.effects.length = 0;
  state.listeners.clear();
  state.nextId = 0;
  state.push.checkPermissions.mockResolvedValue({ receive: 'granted' });
  state.push.createChannel.mockResolvedValue(undefined);
  state.push.register.mockResolvedValue(undefined);
  state.push.removeAllListeners.mockImplementation(async () => { state.listeners.clear(); });
  state.push.addListener.mockImplementation(async (name: string, callback: (...args: unknown[]) => void) => {
    const id = ++state.nextId;
    state.listeners.set(id, { name, callback });
    return { remove: vi.fn(async () => { state.listeners.delete(id); }) };
  });
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

describe('native push setup lifecycle', () => {
  it('stops a late permission result from registering after cleanup', async () => {
    let resolve!: (value: { receive: string }) => void;
    state.push.checkPermissions.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    useNativeNotifications();
    const cleanup = state.effects[0]() as () => void;
    cleanup();
    resolve({ receive: 'granted' });
    await new Promise(r => setTimeout(r, 0));
    expect(state.push.addListener).not.toHaveBeenCalled();
    expect(state.push.register).not.toHaveBeenCalled();
  });

  it('effect replay registers once and preserves listeners owned by another feature', async () => {
    state.listeners.set(-1, { name: 'external', callback: () => {} });
    useNativeNotifications();
    const oldCleanup = state.effects[0]() as () => void;
    oldCleanup();
    const cleanup = state.effects[0]() as () => void;
    await vi.waitFor(() => expect(state.push.register).toHaveBeenCalledTimes(1));
    expect([...state.listeners.values()].filter(x => x.name !== 'external')).toHaveLength(4);
    expect(state.listeners.has(-1)).toBe(true);
    cleanup();
    await vi.waitFor(() => expect([...state.listeners.keys()]).toEqual([-1]));
    expect(state.push.removeAllListeners).not.toHaveBeenCalled();
  });

  it('cleans partially attached listeners if setup fails', async () => {
    const attach = state.push.addListener.getMockImplementation()!;
    state.push.addListener.mockImplementation((name: string, callback: (...args: unknown[]) => void) => {
      if (name === 'registrationError') return Promise.reject(new Error('Simulated native failure'));
      return attach(name, callback);
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    useNativeNotifications();
    const cleanup = state.effects[0]() as () => void;
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
    expect(state.listeners.size).toBe(0);
    cleanup();
    log.mockRestore();
  });

  it('ignores native events already queued when the owning effect is cleaned up', async () => {
    useNativeNotifications();
    const cleanup = state.effects[0]() as () => void;
    await vi.waitFor(() => expect(state.push.register).toHaveBeenCalledTimes(1));
    const received = [...state.listeners.values()].find(x => x.name === 'pushNotificationReceived')!;
    cleanup();
    received.callback({ title: 'Late local fixture event' });
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});
