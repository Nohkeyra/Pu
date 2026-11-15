import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
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
 * APK-only, single-screen onboarding. Stays open until Get Started is pressed.
 * The physical sign, wall and UI controls are separate layers. Both themes share
 * the exact same camera and sign asset; only illumination and the wall change.
 */
export default function NativeWelcomeScreen({ isLoading, onComplete }: NativeWelcomeScreenProps) {
  const { language } = useLanguage();
  const { theme, setThemeFromWelcome } = useTheme();
  const reducedMotion = Boolean(useReducedMotion());
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const completion = useRef(onComplete);
  const isMalay = language === 'bm';

  useEffect(() => { completion.current = onComplete; }, [onComplete]);
  useEffect(() => () => {
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
  }, []);

  const start = () => {
    if (isLoading || exiting) return;
    setExiting(true);
    if (reducedMotion) {
      completion.current();
    } else {
      exitTimer.current = window.setTimeout(() => completion.current(), 220);
    }
  };

  return (
    <main
      className={`native-welcome${exiting ? ' native-welcome--exiting' : ''}`}
      data-theme={theme}
      aria-label={isMalay ? 'Selamat datang ke Restoran Wawasan' : 'Welcome to Restoran Wawasan'}
    >
      <div className="native-welcome__wall" aria-hidden="true">
        <img className="native-welcome__wall-image native-welcome__wall-image--day" src={getAssetUrl('/assets/illustrations/wawasan-native-wall-day.webp')} alt="" draggable={false} />
        <img className="native-welcome__wall-image native-welcome__wall-image--night" src={getAssetUrl('/assets/illustrations/wawasan-native-wall-night.webp')} alt="" draggable={false} />
      </div>

      <button
        type="button"
        className="native-welcome__theme-icon"
        aria-label={theme === 'light'
          ? (isMalay ? 'Tukar ke mod gelap' : 'Switch to dark mode')
          : (isMalay ? 'Tukar ke mod cerah' : 'Switch to light mode')}
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        onClick={() => setThemeFromWelcome(theme === 'light' ? 'dark' : 'light')}
        disabled={exiting}
      >
        {theme === 'light' ? <Moon size={25} strokeWidth={1.9} aria-hidden="true" /> : <Sun size={25} strokeWidth={1.9} aria-hidden="true" />}
      </button>

      <div className="native-welcome__scroll">
        <div className="native-welcome__layout">
          <div className="native-welcome__sign-stage" role="img" aria-label={isMalay ? 'Papan tanda tiga dimensi Restoran Wawasan' : 'Three-dimensional Restoran Wawasan wall sign'}>
            <div className="native-welcome__led-ambient" aria-hidden="true" />
            <img
              src={getAssetUrl('/assets/illustrations/wawasan-native-sign-cutout.webp')}
              className="native-welcome__sign"
              alt=""
              width={753}
              height={647}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <div className="native-welcome__message">
            <h1 className="native-welcome__heading">
              {isMalay ? 'Selamat Datang!' : 'Welcome!'}
            </h1>
            <svg className="native-welcome__underline" aria-hidden="true" viewBox="0 0 188 14" fill="none">
              <path d="M5 11C52 1 133 1 183 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <p className="native-welcome__tagline">
              {isMalay ? 'Dari Wawasan, dengan rasa.' : 'From Wawasan, with flavour.'}
            </p>
          </div>

          <div className="native-welcome__actions">
            <button
              type="button"
              className="native-welcome__button"
              onClick={start}
              disabled={isLoading || exiting}
              aria-label={isMalay ? 'Mula menggunakan aplikasi Restoran Wawasan' : 'Get started with Restoran Wawasan'}
            >
              <span>Get Started</span>
              <ArrowRight size={21} strokeWidth={2.2} aria-hidden="true" />
            </button>
            {isLoading && (
              <span className="native-welcome__status" role="status" aria-live="polite">
                {isMalay ? 'Menyediakan aplikasi…' : 'Preparing the app…'}
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
