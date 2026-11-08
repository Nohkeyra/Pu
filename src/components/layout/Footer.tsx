import { Facebook } from 'lucide-react';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getAssetUrl } from '../../lib/utils';
import { TransparentLogo } from '../brand/TransparentLogo';

function BrandMark() {
  return (
    <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 p-2 shadow-md shadow-black/30">
      <TransparentLogo
        src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
        alt="Restoran Wawasan Logo"
        className="w-full h-full object-contain drop-shadow"
      />
    </div>
  );
}

export default function Footer() {
  const { t, language } = useLanguage();
  const footerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: footerRef, offset: ['start end', 'end end'] });
  const artworkOpacity = useTransform(scrollYProgress, [0, 0.45, 0.8, 1], reduceMotion ? [0.68, 0.68, 0.68, 0.68] : [0.76, 0.72, 0.52, 0.32]);
  const artworkY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 24]);
  const bm = language === 'bm';
  const NAV_LINKS = [
    { label: t('our_story'), href: '#story' },
    { label: t('menu'), href: '#menu' },
    { label: t('experience'), href: '#experience' },
    { label: t('reviews'), href: '#reviews' },
    { label: t('visit_us'), href: '#visit' },
  ];

  return (
    <footer ref={footerRef} id="app-footer" className="bg-[var(--ui-canvas)] dark:bg-[var(--ui-canvas)] text-white/90 pt-16 pb-[calc(100px+env(safe-area-inset-bottom,16px))] relative overflow-hidden transition-colors duration-500 border-t border-amber-500/20">
      <motion.div className="landing-footer-batik" aria-hidden="true" style={{ opacity: artworkOpacity, y: artworkY }}>
        <img src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')} alt="" draggable={false} />
      </motion.div>

      <div className="content-container relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start mb-16">

          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3.5 group min-h-[44px]">
              <BrandMark />
              <div>
                <span className="font-display font-semibold text-2xl text-white tracking-tight group-hover:text-[var(--color-sunshine-cta)] transition-colors drop-shadow-sm">
                  Restoran Wawasan
                </span>
                <span className="microcopy-12-upper block text-[var(--color-sunshine-cta)] mt-0.5 font-semibold">
                  Pak Usop
                </span>
              </div>
            </Link>
            <p className="font-body text-white/80 dark:text-[var(--ui-legacy-white)]/85 text-sm max-w-sm leading-relaxed font-normal drop-shadow-sm">
              {bm ? 'Warisan rasa dari Singapura sejak 1986, kini menyajikan hidangan Nusantara di tengah-tengah Putrajaya.' : 'A culinary legacy from Singapore since 1986, now serving authentic Nusantara comfort food in the heart of Putrajaya.'}
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href="https://www.facebook.com/WawasanRestoran"
                aria-label="Facebook Restoran Wawasan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white/75 hover:bg-[var(--color-sunshine-cta)] hover:text-[var(--ui-on-action)] transition-all duration-300 border border-white/10 hover:border-[var(--color-sunshine-cta)]"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-display font-semibold text-lg text-white dark:text-[var(--ui-legacy-white)]">{bm ? 'Terokai' : 'Explore'}</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-white/80 dark:text-[var(--ui-legacy-white)]/80 hover:text-[var(--color-sunshine-cta)] dark:hover:text-[var(--color-sunshine-cta)] transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-normal text-white/60 dark:text-[var(--ui-legacy-white)]/60">
          <p>© {new Date().getFullYear()} Restoran Wawasan Pak Usop. {bm ? 'Hak cipta terpelihara.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('app:open-privacy-policy'))}
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center text-white/75 hover:text-[var(--color-sunshine-cta)] cursor-pointer"
            >
              {bm ? 'Dasar Privasi' : 'Privacy Policy'}
            </button>
            <Link to="/order" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center text-white/75 hover:text-[var(--color-sunshine-cta)]">
              {bm ? 'Tempah Dalam Talian' : 'Order Online'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
