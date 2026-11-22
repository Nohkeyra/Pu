import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { getAssetUrl } from '@/lib/utils';
import './NativeWelcomeScreen.css';

// Original sign outline in the artwork’s 753 × 647 coordinate space.
// Starts at the top and closes clockwise; this is light, not replacement artwork.
const SIGN_LIGHT_OUTLINE = `
  M376 21
  C393.5 22.0 417.5 26.5 432.0 30.0
  C446.5 33.5 452.8 37.2 463.0 42.0
  C473.2 46.8 484.2 53.2 493.0 59.0
  C501.8 64.8 506.7 67.8 516.0 77.0
  C525.3 86.2 540.2 102.3 549.0 114.0
  C557.8 125.7 563.3 135.5 569.0 147.0
  C574.7 158.5 579.7 175.7 583.0 183.0
  C586.3 190.3 583.8 189.2 589.0 191.0
  C594.2 192.8 606.0 192.2 614.0 194.0
  C622.0 195.8 629.8 198.7 637.0 202.0
  C644.2 205.3 651.3 209.7 657.0 214.0
  C662.7 218.3 666.5 221.8 671.0 228.0
  C675.5 234.2 680.7 243.0 684.0 251.0
  C687.3 259.0 689.8 266.8 691.0 276.0
  C692.2 285.2 692.7 296.2 691.0 306.0
  C689.3 315.8 681.2 325.7 681.0 335.0
  C680.8 344.3 688.3 353.8 690.0 362.0
  C691.7 370.2 690.7 379.7 691.0 384.0
  C691.3 388.3 688.7 384.7 692.0 388.0
  C695.3 391.3 706.8 398.2 711.0 404.0
  C715.2 409.8 713.8 417.5 717.0 423.0
  C720.2 428.5 727.5 430.7 730.0 437.0
  C732.5 443.3 732.2 455.3 732.0 461.0
  C731.8 466.7 732.2 464.5 729.0 471.0
  C725.8 477.5 717.7 492.8 713.0 500.0
  C708.3 507.2 706.2 509.2 701.0 514.0
  C695.8 518.8 690.0 518.8 682.0 529.0
  C674.0 539.2 661.5 564.3 653.0 575.0
  C644.5 585.7 639.3 588.0 631.0 593.0
  C622.7 598.0 611.3 602.3 603.0 605.0
  C594.7 607.7 590.5 608.5 581.0 609.0
  C571.5 609.5 568.7 612.2 546.0 608.0
  C523.3 603.8 468.8 589.2 445.0 584.0
  C421.2 578.8 411.2 576.0 403.0 577.0
  C394.8 578.0 398.8 586.8 396.0 590.0
  C393.2 593.2 397.3 596.0 386.0 596.0
  C374.7 596.0 344.0 590.7 328.0 590.0
  C312.0 589.3 308.3 589.3 290.0 592.0
  C271.7 594.7 239.3 600.5 218.0 606.0
  C196.7 611.5 174.2 621.8 162.0 625.0
  C149.8 628.2 149.2 626.2 145.0 625.0
  C140.8 623.8 139.3 622.5 137.0 618.0
  C134.7 613.5 134.0 603.2 131.0 598.0
  C128.0 592.8 123.2 592.7 119.0 587.0
  C114.8 581.3 112.3 567.7 106.0 564.0
  C99.7 560.3 87.0 565.8 81.0 565.0
  C75.0 564.2 73.3 561.8 70.0 559.0
  C66.7 556.2 64.2 555.0 61.0 548.0
  C57.8 541.0 51.8 529.0 51.0 517.0
  C50.2 505.0 58.5 485.2 56.0 476.0
  C53.5 466.8 41.8 469.7 36.0 462.0
  C30.2 454.3 23.5 439.3 21.0 430.0
  C18.5 420.7 20.2 413.0 21.0 406.0
  C21.8 399.0 22.0 396.7 26.0 388.0
  C30.0 379.3 36.2 365.8 45.0 354.0
  C53.8 342.2 68.7 326.7 79.0 317.0
  C89.3 307.3 97.2 302.5 107.0 296.0
  C116.8 289.5 132.8 289.5 138.0 278.0
  C143.2 266.5 136.2 243.2 138.0 227.0
  C139.8 210.8 143.0 197.2 149.0 181.0
  C155.0 164.8 165.2 144.7 174.0 130.0
  C182.8 115.3 191.5 104.3 202.0 93.0
  C212.5 81.7 224.3 71.0 237.0 62.0
  C249.7 53.0 263.0 45.3 278.0 39.0
  C293.0 32.7 310.7 27.0 327.0 24.0
  C343.3 21.0 358.5 20.0 376.0 21.0
  Z
`;

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
  const [signReady, setSignReady] = useState(false);
  const signImage = useRef<HTMLImageElement>(null);
  const exitTimer = useRef<number | null>(null);
  const completion = useRef(onComplete);
  const isMalay = language === 'bm';
  const themeLabel = theme === 'light'
    ? (isMalay ? 'Tukar ke mod gelap' : 'Switch to dark mode')
    : (isMalay ? 'Tukar ke mod cerah' : 'Switch to light mode');

  useEffect(() => { completion.current = onComplete; }, [onComplete]);
  useEffect(() => {
    if (signImage.current?.complete && signImage.current.naturalWidth > 0) setSignReady(true);
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
            {/* Wall spill sits behind the opaque board; it follows exactly the
                same powered length as the tube on the front rim. */}
            <svg className="native-welcome__led-ambient" viewBox="0 0 753 647" aria-hidden="true">
              <path className="native-welcome__light-path" d={SIGN_LIGHT_OUTLINE} pathLength={1} />
            </svg>
            <img
              ref={signImage}
              src={getAssetUrl('/assets/illustrations/wawasan-native-sign-cutout.webp')}
              className="native-welcome__sign"
              alt=""
              width={753}
              height={647}
              draggable={false}
              decoding="async"
              fetchPriority="high"
              onLoad={() => setSignReady(true)}
            />
            <svg className="native-welcome__rim-light" viewBox="0 0 753 647" aria-hidden="true">
              <path className="native-welcome__light-path native-welcome__rim-halo" d={SIGN_LIGHT_OUTLINE} pathLength={1} />
              <path className="native-welcome__light-path native-welcome__rim-tube" d={SIGN_LIGHT_OUTLINE} pathLength={1} />
              <path className="native-welcome__light-path native-welcome__rim-core" d={SIGN_LIGHT_OUTLINE} pathLength={1} />
            </svg>
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
