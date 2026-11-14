import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { getAssetUrl } from '@/lib/utils';
import './NativeWelcomeScreen.css';

interface NativeWelcomeScreenProps {
  isLoading: boolean;
  onComplete: () => void;
}

/**
 * APK-only welcome gate. Unlike the short web loading splash, this screen
 * deliberately remains open until Get Started is pressed. The sign artwork
 * is a matched, fixed-camera light/dark presentation of the existing brand.
 */
export default function NativeWelcomeScreen({ isLoading, onComplete }: NativeWelcomeScreenProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const reduceMotion = Boolean(useReducedMotion());
  const [exiting, setExiting] = useState(false);
  const completionTimer = useRef<number | NodeJS.Timeout | null>(null);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => () => {
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
  }, []);

  const startApp = () => {
    if (isLoading || exiting) return;
    setExiting(true);
    if (reduceMotion) {
      completeRef.current();
      return;
    }
    completionTimer.current = window.setTimeout(() => completeRef.current(), 220);
  };

  const bm = language === 'bm';

  return (
    <main
      className={`native-welcome${exiting ? ' native-welcome--exiting' : ''}`}
      data-theme={theme}
      aria-label={bm ? 'Selamat datang ke Restoran Wawasan' : 'Welcome to Restoran Wawasan'}
    >
      <div className="native-welcome__room-light" aria-hidden="true" />
      <div className="native-welcome__layout">
        <div className="native-welcome__hero">
          <div
            className="native-welcome__art"
            role="img"
            aria-label={bm ? 'Logo Restoran Wawasan pada dinding dengan pencahayaan semula jadi atau LED' : 'Restoran Wawasan wall sign in natural or LED lighting'}
          >
            <div className="native-welcome__led-bounce" aria-hidden="true" />
            <img
              className="native-welcome__photo native-welcome__photo--day"
              src={getAssetUrl('/assets/illustrations/wawasan-welcome-morning.webp')}
              alt=""
              width={1254}
              height={1254}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <img
              className="native-welcome__photo native-welcome__photo--night"
              src={getAssetUrl('/assets/illustrations/wawasan-welcome-night.webp')}
              alt=""
              width={1254}
              height={1254}
              draggable={false}
              decoding="async"
            />
          </div>
        </div>

        <div className="native-welcome__message">
          <h1 className="native-welcome__heading">
            {bm ? 'Selamat Datang!' : 'Welcome!'}
          </h1>
          <svg aria-hidden="true" className="native-welcome__underline" viewBox="0 0 188 14" fill="none">
            <path d="M5 11C52 1 133 1 183 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <p className="native-welcome__tagline">
            {bm ? 'Dari Wawasan, dengan rasa.' : 'From Wawasan, with flavour.'}
          </p>
        </div>

        <div className="native-welcome__actions">
          <button
            type="button"
            className="native-welcome__button"
            onClick={startApp}
            disabled={isLoading || exiting}
            aria-label={bm ? 'Mula menggunakan aplikasi Restoran Wawasan' : 'Get started with Restoran Wawasan'}
          >
            <span>Get Started</span>
            <ArrowRight aria-hidden="true" size={21} strokeWidth={2.4} />
          </button>
          {isLoading && (
            <span className="native-welcome__status" role="status" aria-live="polite">
              {bm ? 'Menyediakan aplikasi…' : 'Preparing the app…'}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
