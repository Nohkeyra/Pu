
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import GlitchText from '../components/GlitchText';

import { Batik3DMotion } from '../components/Batik3DMotion';
import { getAssetUrl } from '../lib/utils';

export default function HeroSection() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 120]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  };

  return (
    <section className="relative w-full overflow-hidden bg-cream dark:bg-charcoal pt-24 pb-20 min-h-[680px] flex flex-col justify-center items-center">
      {/* Food-Centric Backdrop */}
      <div className="absolute top-0 left-0 right-0 w-full h-full z-0 overflow-hidden bg-gradient-to-b from-charcoal via-amber-950/70 to-charcoal dark:bg-charcoal transition-colors duration-300">
        <motion.div 
          style={{ y }} 
          className="absolute -top-36 -bottom-36 -left-16 -right-16"
        >
          <Batik3DMotion
            mode="background"
            src={getAssetUrl('/assets/batik_vector_pattern.jpg')}
            backgroundSize="cover"
            backgroundRepeat="no-repeat"
            maxRotation={16}
            imgClassName="opacity-75 dark:opacity-35 transition-opacity duration-300"
            maskImage="linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.5) 70%, transparent 95%)"
          />
        </motion.div>
        {/* Warm Overlay & Contrast Protection */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-charcoal/95 z-0 transition-all duration-300" />
        {/* Pattern overlay */}
        <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none [mask-image:linear-gradient(to_bottom,black_30%,transparent_85%)]" />

        {/* Bottom smooth gradient dissolve */}
        <div className="absolute inset-x-0 bottom-0 h-32 sm:h-48 md:h-60 bg-gradient-to-b from-transparent via-cream/80 to-cream dark:via-charcoal/80 dark:to-charcoal z-10 pointer-events-none transition-colors duration-300" />
      </div>

      {/* Decorative ambient radial glows */}
      <div className="absolute top-[15%] left-[10%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] rounded-full bg-[var(--color-sunshine-cta)]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30vw] h-[30vw] max-w-[350px] max-h-[350px] rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="content-container flex flex-col items-center text-center relative z-20 w-full py-12 md:py-16"
      >
        <motion.div variants={itemVariants} className="mb-4">
          <span className="typography-accent-pill border-amber-400/40 bg-amber-500/20 text-amber-200 backdrop-blur-md">
            ✦ Restoran Wawasan Pak Usop • Est. 1986
          </span>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-6 drop-shadow-2xl leading-tight"
        >
          <GlitchText text={t('hero_glitch')} />
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-amber-50/90 max-w-2xl mx-auto font-medium mb-8 leading-relaxed drop-shadow-md"
        >
          {t('hero_description')}
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-6 sm:px-0">
          <a href="#menu" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-[var(--color-sunshine-cta)] text-deep-forest rounded-2xl font-black text-sm md:text-base hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 hover:shadow-sunshine-glow hover:-translate-y-0.5 flex items-center justify-center gap-2 group cursor-pointer">
            <UtensilsCrossed className="w-5 h-5 text-deep-forest" />
            {t('explore_menu_btn')}
            <ArrowRight className="w-4 h-4 text-deep-forest transition-transform group-hover:translate-x-1" />
          </a>
          <Link to="/order" className="px-8 py-4 bg-black/60 backdrop-blur-xl border border-white/30 text-white rounded-2xl font-bold text-sm md:text-base hover:bg-white/20 transition-all shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2">
            {t('order_catering_btn')}
          </Link>
        </motion.div>

      </motion.div>
    </section>
  );
}

