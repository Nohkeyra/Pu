import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Toast as NativeToast } from '@capacitor/toast';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock('@capacitor/toast', () => ({
  Toast: { show: vi.fn().mockResolvedValue(undefined) },
}));

describe('ToastProvider on a native platform', () => {
  it.each(['success', 'error', 'warning', 'info'] as const)(
    'does not send a second %s toast through the Android bridge',
    (variant) => {
      const show = vi.mocked(NativeToast.show);
      show.mockClear();

      function TriggerToast() {
        const { toast } = useToast();
        toast({ title: 'Message', description: 'Details', variant, duration: 0 });
        return null;
      }

      renderToStaticMarkup(createElement(ToastProvider, { children: createElement(TriggerToast) }));
      expect(show).not.toHaveBeenCalled();
    },
  );
});
