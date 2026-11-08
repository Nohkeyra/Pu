import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import type { PluginListenerHandle } from '@capacitor/core';

interface KeyboardSnapshot {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

// One keyboard-state source for Back, bottom navigation and the Order form.
// Avoid repeated native subscriptions and never change Capacitor's resize mode
// at runtime: capacitor.config.ts already owns that choice.
let snapshot: KeyboardSnapshot = { keyboardHeight: 0, isKeyboardVisible: false };
const subscribers = new Set<() => void>();
let stopMonitoring: (() => void) | null = null;

function publish(keyboardHeight: number) {
  const height = Math.max(0, Math.round(keyboardHeight));
  const visible = height > 0;
  if (snapshot.keyboardHeight === height && snapshot.isKeyboardVisible === visible) return;
  snapshot = { keyboardHeight: height, isKeyboardVisible: visible };
  subscribers.forEach(listener => listener());
}

function monitorKeyboard(): () => void {
  if (Capacitor.isNativePlatform()) {
    let active = true;
    const handles: PluginListenerHandle[] = [];
    const onShow = (event: { keyboardHeight: number }) => {
      // Some devices emit WillShow, others DidShow, or both.
      publish(Math.max(1, event.keyboardHeight || 0));
    };
    const onHide = () => publish(0);
    void Promise.allSettled([
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardDidShow', onShow),
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ]).then(results => {
      results.forEach(result => {
        if (result.status !== 'fulfilled') return;
        if (active) handles.push(result.value);
        else void result.value.remove();
      });
    });
    return () => {
      active = false;
      handles.forEach(handle => { void handle.remove(); });
    };
  }

  // Browser / Google AI Studio preview: the virtual keyboard shrinks the
  // visual viewport without necessarily changing window.innerHeight.
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  let baseline = viewport.height;
  let focusTimeout: ReturnType<typeof setTimeout> | undefined;
  const isTextField = () => document.activeElement?.matches(
    'input, textarea, select, [contenteditable="true"]'
  ) ?? false;
  const update = () => {
    if (!isTextField()) {
      baseline = Math.max(baseline, viewport.height);
      publish(0);
      return;
    }
    const covered = Math.max(0, baseline - viewport.height - viewport.offsetTop);
    publish(covered > 120 ? covered : 0);
  };
  const onFocus = () => {
    if (focusTimeout) clearTimeout(focusTimeout);
    focusTimeout = setTimeout(update, 100);
  };
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onFocus);
  const onOrientationChange = () => { baseline = viewport.height; update(); };
  window.addEventListener('orientationchange', onOrientationChange);
  return () => {
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('focusout', onFocus);
    window.removeEventListener('orientationchange', onOrientationChange);
    if (focusTimeout) clearTimeout(focusTimeout);
  };
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  if (subscribers.size === 1) stopMonitoring = monitorKeyboard();
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) {
      stopMonitoring?.();
      stopMonitoring = null;
      publish(0);
    }
  };
}

const getSnapshot = () => snapshot;

export function useMobileKeyboard(): KeyboardSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
