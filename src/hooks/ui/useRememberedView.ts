import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
const PREFIX = 'wawasan:view:v1:';
type Scalar = string | number | boolean;
export function readViewValue<T extends Scalar>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(PREFIX + key) || 'null');
    if (
      typeof value !== typeof fallback ||
      (typeof value === 'number' && !Number.isFinite(value)) ||
      (typeof value === 'string' && value.length > 1000)
    )
      return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}
export function writeViewValue(key: string, value: Scalar) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Storage may be unavailable. */
  }
}
export function adminViewScope(token?: string): string {
  try {
    const payload = JSON.parse(
      atob((token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return typeof payload.uid === 'string' ? `admin:${payload.uid}` : 'admin';
  } catch {
    return 'admin';
  }
}
export function clearRememberedViews(scope: string) {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(PREFIX + scope + ':'))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* Storage may be unavailable. */
  }
}
export function useRememberedState<T extends Scalar>(
  key: string,
  fallback: T
): [T, Dispatch<SetStateAction<T>>] {
  const [entry, setEntry] = useState(() => ({ key, value: readViewValue(key, fallback) }));
  const value = entry.key === key ? entry.value : readViewValue(key, fallback);
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) =>
      setEntry((previous) => {
        const current = previous.key === key ? previous.value : readViewValue(key, fallback);
        const updated = typeof next === 'function' ? next(current) : next;
        writeViewValue(key, updated);
        return { key, value: updated };
      }),
    [key, fallback]
  );
  return [value, setValue];
}
export function useRememberedPageScroll(key: string, ready = true) {
  useEffect(() => {
    if (!ready) return;
    const target = Math.max(0, readViewValue(key, 0));
    let last = target,
      frame = 0,
      attempts = 0,
      restoring = true;
    const restore = () => {
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      window.scrollTo({ top: Math.min(target, max), behavior: 'instant' });
      if (max < target && ++attempts < 30) frame = requestAnimationFrame(restore);
      else restoring = false;
    };
    frame = requestAnimationFrame(restore);
    const save = () => {
      if (!restoring) {
        last = window.scrollY;
        writeViewValue(key, last);
      }
    };
    const interrupt = () => {
      restoring = false;
      cancelAnimationFrame(frame);
    };
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      writeViewValue(key, last);
      window.removeEventListener('scroll', save);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
    };
  }, [key, ready]);
}
export function useRememberedListScroll(key: string) {
  const detach = useRef<() => void>(() => {});
  const saved = useRef({ key, value: Math.max(0, readViewValue(key, 0)) });
  useEffect(() => () => detach.current(), []);
  return useCallback(
    (api: { element: HTMLDivElement | null } | null) => {
      detach.current();
      detach.current = () => {};
      if (saved.current.key !== key)
        saved.current = { key, value: Math.max(0, readViewValue(key, 0)) };
      const element = api?.element;
      if (!element) return;
      const target = saved.current.value;
      let restoring = true,
        frame = 0,
        attempts = 0;
      const restore = () => {
        const max = element.scrollHeight - element.clientHeight;
        element.scrollTop = Math.min(target, Math.max(0, max));
        if (max < target && ++attempts < 30) frame = requestAnimationFrame(restore);
        else restoring = false;
      };
      frame = requestAnimationFrame(restore);
      const save = () => {
        if (!restoring) {
          saved.current.value = element.scrollTop;
          writeViewValue(key, element.scrollTop);
        }
      };
      const interrupt = () => {
        restoring = false;
        cancelAnimationFrame(frame);
      };
      element.addEventListener('scroll', save, { passive: true });
      element.addEventListener('wheel', interrupt, { passive: true });
      element.addEventListener('touchstart', interrupt, { passive: true });
      detach.current = () => {
        cancelAnimationFrame(frame);
        writeViewValue(key, saved.current.value);
        element.removeEventListener('scroll', save);
        element.removeEventListener('wheel', interrupt);
        element.removeEventListener('touchstart', interrupt);
      };
    },
    [key]
  );
}
