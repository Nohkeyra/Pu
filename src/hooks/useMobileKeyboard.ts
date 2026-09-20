import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export function useMobileKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      Keyboard.setResizeMode({ mode: 'native' as any }).catch(() => {});
      Keyboard.setScroll({ isDisabled: false }).catch(() => {});
    } catch {
      // Ignore if not supported on browser/web
    }

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
      setIsKeyboardVisible(true);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showListener.then((listener) => listener.remove()).catch(() => {});
      hideListener.then((listener) => listener.remove()).catch(() => {});
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
