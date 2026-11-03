import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Batik3DMotion } from '@/components/brand/Batik3DMotion';
import { getAssetUrl } from '@/lib/utils';

/**
 * Restores the original full-bleed heritage hero without a photograph or outer card.
 * Reuses the exact legacy batik and its existing device-motion renderer.
 * The header sits above this section as a transparent, fixed overlay.
 */
const HeroSection = React.memo(() => {
  const { t } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const batikY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, 150]
  );
  const batikOpacity = useTransform(
    scrollYProgress,
    [0, 0.6, 1],
    reduceMotion ? [1, 1, 1] : [1, 0.7, 0]
  );
  const batikScale = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [1, 1] : [1, 1.04]
  );

  return (
    <section
      ref={heroRef}
      className="landing-hero heritage-hero"
      aria-labelledby="landing-brand-title"
    >
      {/* Authentic Wawasan image, same file and 3D-motion component as the old hero. */}
      <div className="heritage-hero-scene" aria-hidden="true">
        <motion.div
          className="heritage-hero-artwork"
          style={{ y: batikY, opacity: batikOpacity, scale: batikScale }}
        >
          <Batik3DMotion
            mode="img"
            src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')}
            alt=""
            maxRotation={12}
            imgClassName="heritage-hero-batik-image"
          />
        </motion.div>
        <div className="heritage-hero-shading" />
        <div className="heritage-hero-vignette" />
        <div className="heritage-hero-dissolve" />
      </div>

      <motion.div
        className="content-container heritage-hero-content"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          id="landing-brand-title"
          className="font-artistic heritage-hero-title"
        >
          {t('hero_title') || 'Restoran Wawasan'}
        </h1>
        <p className="heritage-hero-description">
          {t('hero_description')}
        </p>
        <div className="heritage-hero-actions">
          <a href="#menu" className="heritage-hero-action heritage-hero-action-primary">
            <UtensilsCrossed size={21} aria-hidden="true" />
            <span>{t('explore_menu_btn')}</span>
            <ArrowRight size={19} aria-hidden="true" />
          </a>
          <Link to="/order" className="heritage-hero-action heritage-hero-action-secondary">
            <span>{t('order_catering_btn')}</span>
          </Link>
        </div>
        <a href="#menu" className="heritage-hero-scroll-hint">
          <span aria-hidden="true" className="heritage-hero-scroll-line" />
          <span>{t('scroll_explore')}</span>
        </a>
      </motion.div>
    </section>
  );
});

export default HeroSection;
