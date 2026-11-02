import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, MapPin, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { MENU_ITEMS } from '@/constants/menu';
import ResponsiveImage from '@/components/ResponsiveImage';
import { getAssetUrl } from '@/lib/utils';

const featuredDish = MENU_ITEMS.find((item) => item.id === 'nasi-campur')!;
const HERO_IMAGE = '/assets/dishes/photos/wawasan-craft.webp';
const featuredDrink = MENU_ITEMS.find((item) => item.id === 'teh-tarik')!;

const HeroSection = React.memo(() => {
  const { t, language } = useLanguage();
  const bm = language === 'bm';
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroBatikY = useTransform(
    heroScrollProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, 32]
  );

  return (
    <section ref={heroRef} className="landing-hero" aria-labelledby="landing-brand-title">
      <div className="content-container">
        <div className="landing-hero-frame">
          <motion.div
            className="landing-hero-batik batik-container"
            aria-hidden="true"
            style={{
              backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')})`,
              y: heroBatikY,
            }}
          />
          <motion.div
            className="landing-hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="landing-hero-kicker">
              <span />
              {bm ? 'Dari Wawasan, dengan rasa.' : 'From Wawasan, with flavour.'}
            </p>
            <h1
              id="landing-brand-title"
              className="font-artistic text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[7.5rem] text-white dark:text-[#fcf8f0] tracking-wide leading-[1.1] sm:leading-[1] text-balance drop-shadow-[0_4px_32px_rgba(0,0,0,0.95)]"
              style={{ textShadow: '0 4px 24px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.6)' }}
            >
              {t('hero_title') || 'Restoran Wawasan'}
            </h1>
            <svg aria-hidden="true" viewBox="0 0 180 12" className="block h-2 w-32 sm:w-44 text-[#df710f] dark:text-[#ffa42c] mb-5">
              <path d="M 3 9 Q 90 -3 177 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <p className="landing-hero-description">{t('hero_description')}</p>
            <div className="landing-hero-actions">
              <Link to="/order" className="landing-button landing-button-primary">
                <UtensilsCrossed size={18} aria-hidden="true" />
                {t('order_catering_btn')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <a href="#menu" className="landing-button landing-button-outline">
                {t('explore_menu_btn')}
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="landing-hero-location">
              <MapPin size={15} aria-hidden="true" />
              <span>Menara PjH · Putrajaya</span>
              <span className="landing-hero-since">{bm ? 'Sejak 1986' : 'Since 1986'}</span>
            </div>
          </motion.div>
          <motion.figure
            className="landing-hero-figure"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.65 }}
          >
            <div className="landing-feature-photo">
              <ResponsiveImage
                src={HERO_IMAGE}
                alt={bm ? featuredDish.nameBm : featuredDish.nameEn}
                width={800}
                height={640}
                aspectRatio="5/4"
                lazy={false}
                fetchPriority="high"
                objectFit="cover"
                containerClassName="landing-feature-image"
              />
            </div>
            <div className="landing-hero-drink" aria-hidden="true">
              <img src={getAssetUrl(featuredDrink.image || '')} alt="" width={120} height={120} />
              <span>Teh Tarik Kaw</span>
            </div>
          </motion.figure>
        </div>
        <p className="landing-hero-note">
          <span>
            {bm
              ? 'Sajian harian. Majlis istimewa. Rasa yang sama dekat di hati.'
              : 'Everyday meals. Special gatherings. The same familiar flavour.'}
          </span>
          <a href="#visit">
            {bm ? 'Jemput datang' : 'Come visit'}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>
  );
});
export default HeroSection;
