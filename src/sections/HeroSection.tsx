
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Batik3DMotion } from '../components/Batik3DMotion';
import { getAssetUrl } from '../lib/utils';

export default function HeroSection() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  
  // Parallax and scroll effects
  const y = useTransform(scrollY, [0, 800], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.95]);
  
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothY = useSpring(y, springConfig);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0, filter: 'blur(10px)' },
    visible: { 
      y: 0, 
      opacity: 1, 
      filter: 'blur(0px)',
      transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } 
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#0a1c18] dark:bg-[#0c100e] pt-[calc(7.5rem+var(--sat,0px))] sm:pt-36 pb-[calc(6.5rem+var(--sab,0px))] sm:pb-28 min-h-[100dvh] flex flex-col justify-center items-center">
      {/* Cinematic Deep Dark Full-Bleed Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a1c18] dark:bg-[#0c100e]">
        {/* Dynamic Atmospheric Overlays for maximum text & logo legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1c18]/90 via-[#0a1c18]/65 to-[#0a1c18] dark:from-[#0c100e]/95 dark:via-[#0c100e]/75 dark:to-[#0c100e] z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0c453c]/35 via-transparent to-amber-950/20 dark:from-[#101915]/60 dark:to-transparent z-0 pointer-events-none" />
        {/* Soft center vignette to ensure foreground elements are crystal clear */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(10,28,24,0.6)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(12,16,14,0.8)_100%)] z-0 pointer-events-none" />
        
        {/* Batik Background - Elegantly balanced in both light and dark mode */}
        <motion.div 
          style={{ y: smoothY, opacity, scale }} 
          className="batik-fade-transition batik-container absolute inset-0 z-0"
        >
          <Batik3DMotion
            mode="background"
            src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')}
            backgroundSize="cover"
            maxRotation={15}
            imgClassName="opacity-[0.15] sm:opacity-25 dark:opacity-[0.09] dark:sm:opacity-[0.16] dark:contrast-110 dark:brightness-90 dark:saturate-[0.85] transition-opacity duration-700 pointer-events-none"
          />
        </motion.div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pattern-dots opacity-10 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_90%)] pointer-events-none z-10" />
        
        {/* Bottom dissolving gradient seamlessly fading to page canvas */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cream dark:from-[#0c100e] via-cream/60 dark:via-[#0c100e]/60 to-transparent z-10 pointer-events-none" />
      </div>

      {/* Decorative Ambient Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-[20%] left-[5%] w-[40vw] h-[40vw] max-w-[500px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ 
          scale: [1.15, 1, 1.15],
          opacity: [0.06, 0.12, 0.06],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] max-w-[450px] rounded-full bg-[#e03f14]/10 blur-[100px] pointer-events-none z-0" 
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="content-container flex flex-col items-center text-center relative z-20 w-full my-auto py-2 sm:py-6 px-4 sm:px-6"
      >
        {/* Unified Brand Headline */}
        <motion.div variants={itemVariants} className="mb-4 sm:mb-6 max-w-5xl select-none">
          <h1 
            className="font-artistic text-4xl sm:text-6xl md:text-7xl lg:text-[9.5rem] text-white dark:text-[#fcf8f0] tracking-wide leading-[1.1] sm:leading-[1] text-balance drop-shadow-[0_4px_32px_rgba(0,0,0,0.95)]"
            style={{
              textShadow: '0 4px 24px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            {t('hero_title') || 'Restoran Wawasan'}
          </h1>
        </motion.div>
        
        {/* Refined Description */}
        <motion.p 
          variants={itemVariants}
          className="text-sm sm:text-base md:text-xl text-amber-50 dark:text-[#ede5d8] max-w-[65ch] mx-auto font-medium mb-8 sm:mb-10 leading-relaxed bg-black/50 dark:bg-[#0c100e]/85 backdrop-blur-md px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl border border-white/10 dark:border-amber-500/20 shadow-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
        >
          {t('hero_description')}
        </motion.p>
        
        {/* Action Cluster */}
        <motion.div 
          variants={itemVariants} 
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto px-4 sm:px-0 max-w-md sm:max-w-none"
        >
          <a 
            href="#menu" 
            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta-hover)] text-[#ede5d8] rounded-2xl font-bold text-base overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-[var(--color-sunshine-cta)]/25"
          >
            <UtensilsCrossed className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span>{t('explore_menu_btn')}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          
          <Link 
            to="/order" 
            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-[#1c2622]/90 hover:bg-[#26312d] border border-amber-400/30 hover:border-amber-400/60 text-[#ede5d8] rounded-2xl font-bold text-base overflow-hidden transition-all duration-300 active:scale-95 shadow-lg backdrop-blur-md"
          >
            <span>{t('order_catering_btn')}</span>
          </Link>
        </motion.div>

        {/* Scroll Hint */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 sm:mt-14 flex flex-col items-center gap-2 sm:gap-3 text-amber-300/90"
        >
          <div className="w-px h-8 sm:h-10 bg-gradient-to-b from-amber-400 to-transparent" />
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{t('scroll_explore')}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

