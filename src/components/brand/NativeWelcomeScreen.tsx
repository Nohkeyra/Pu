import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
 * The unpowered sign, wall and emitted light are separate layers. The owner
 * supplied both plates; daylight uses their approved unpowered artwork.
 */
export default function NativeWelcomeScreen({ isLoading, onComplete }: NativeWelcomeScreenProps) {
  const { language } = useLanguage();
  const { theme, setThemeFromWelcome } = useTheme();
  const reducedMotion = Boolean(useReducedMotion());
  const [exiting, setExiting] = useState(false);
  const [loadedImages, setLoadedImages] = useState(0);
  const signImages = useRef<Array<HTMLImageElement | null>>([]);
  const signReady = loadedImages === 31;
  const imageLoaded = (index: number) => setLoadedImages(value => value | (1 << index));
  const exitTimer = useRef<number | null>(null);
  const completion = useRef(onComplete);
  const isMalay = language === 'bm';
  // CSS masks must use the exact preloaded URL, including its cache key.
  // A second, cold URL can leave the first short strike without visible tubes.
  const dayMask = getAssetUrl('/assets/illustrations/wawasan-native-neon-day-mask.webp');
  const nightMask = getAssetUrl('/assets/illustrations/wawasan-native-neon-mask.webp');
  const themeLabel = theme === 'light'
    ? (isMalay ? 'Tukar ke mod gelap' : 'Switch to dark mode')
    : (isMalay ? 'Tukar ke mod cerah' : 'Switch to light mode');

  useEffect(() => { completion.current = onComplete; }, [onComplete]);
  useEffect(() => {
    signImages.current.forEach((image, index) => {
      if (image?.complete && image.naturalWidth > 0) imageLoaded(index);
    });
  }, []);
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
      data-ready={!isLoading}
      data-sign-ready={signReady}
      aria-label={isMalay ? 'Selamat datang ke Restoran Wawasan' : 'Welcome to Restoran Wawasan'}
    >
      <div className="native-welcome__wall" aria-hidden="true">
        <img className="native-welcome__wall-image native-welcome__wall-image--day" src={getAssetUrl('/assets/illustrations/wawasan-native-wall-day.webp')} alt="" draggable={false} />
        <img className="native-welcome__wall-image native-welcome__wall-image--night" src={getAssetUrl('/assets/illustrations/wawasan-native-wall-night.webp')} alt="" draggable={false} />
      </div>

      <button
        type="button"
        className="native-welcome__theme-icon"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={() => setThemeFromWelcome(theme === 'light' ? 'dark' : 'light')}
        disabled={exiting}
      >
        {theme === 'light' ? <Moon size={25} strokeWidth={1.9} aria-hidden="true" /> : <Sun size={25} strokeWidth={1.9} aria-hidden="true" />}
      </button>

      <div className="native-welcome__scroll">
        <div className="native-welcome__layout">
          <div className="native-welcome__sign-stage" role="img" aria-label={isMalay ? 'Papan tanda tiga dimensi Restoran Wawasan' : 'Three-dimensional Restoran Wawasan wall sign'}>
            <img
              ref={image => { signImages.current[3] = image; }}
              src={nightMask}
              className="native-welcome__mask-source"
              alt=""
              aria-hidden="true"
              onLoad={() => imageLoaded(3)}
            />
            <img
              ref={image => { signImages.current[4] = image; }}
              src={dayMask}
              className="native-welcome__mask-source"
              alt=""
              aria-hidden="true"
              onLoad={() => imageLoaded(4)}
            />
            <img
              ref={image => { signImages.current[1] = image; }}
              src={getAssetUrl('/assets/illustrations/wawasan-native-neon-spill.webp')}
              className="native-welcome__neon-spill"
              alt=""
              aria-hidden="true"
              width={320}
              height={320}
              draggable={false}
              onLoad={() => imageLoaded(1)}
            />
            <div className="native-welcome__board">
              <img
                ref={image => { signImages.current[0] = image; }}
                src={getAssetUrl('/assets/illustrations/wawasan-native-neon-unlit.webp')}
                className="native-welcome__sign"
                style={{ '--welcome-board-mask': `url("${dayMask}")` } as CSSProperties}
                alt=""
                width={960}
                height={960}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                onLoad={() => imageLoaded(0)}
              />
            </div>
            <div className="native-welcome__neon-power" aria-hidden="true">
              <img
                ref={image => { signImages.current[2] = image; }}
                src={getAssetUrl('/assets/illustrations/wawasan-native-neon.webp')}
                className="native-welcome__neon-tubes"
                style={{ '--welcome-board-mask': `url("${nightMask}")` } as CSSProperties}
                alt=""
                width={960}
                height={960}
                draggable={false}
                decoding="sync"
                onLoad={() => imageLoaded(2)}
              />
            </div>
          </div>

          <div className="native-welcome__content">
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
                lang="en"
                onClick={start}
                disabled={isLoading || exiting}
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
      </div>
    </main>
  );
}
