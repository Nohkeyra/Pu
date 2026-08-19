
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import GlitchText from '../components/GlitchText';
import { Batik3DMotion } from '../components/Batik3DMotion';
import { getAssetUrl } from '../lib/utils';
import { CinematicLogoLayers } from '../components/CinematicLogoLayers';

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
    <section className="relative w-full overflow-hidden bg-cream dark:bg-charcoal pt-32 pb-24 min-h-[100dvh] flex flex-col justify-center items-center">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-charcoal">
        <motion.div 
          style={{ y: smoothY, opacity, scale }} 
          className="absolute inset-0"
        >
          <Batik3DMotion
            mode="background"
            src={getAssetUrl('/assets/batik_vector_pattern.jpg')}
            backgroundSize="cover"
            maxRotation={20}
            imgClassName="opacity-40 dark:opacity-20 mix-blend-overlay transition-opacity duration-700"
          />
        </motion.div>
        
        {/* Dynamic Atmospheric Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-charcoal/20 to-charcoal z-0" />
        <div className="absolute inset-0 bg-gradient-to-tr from-deep-forest/40 via-transparent to-amber-950/20 z-0" />
        
        {/* Grid Pattern with Glow */}
        <div className="absolute inset-0 pattern-dots opacity-20 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_90%)]" />
        
        {/* Bottom dissolving gradient */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-cream via-cream/50 to-transparent dark:from-charcoal dark:via-charcoal/50 dark:to-transparent z-10 pointer-events-none" />
      </div>

      {/* Decorative Ambient Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 20, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-[20%] left-[5%] w-[40vw] h-[40vw] max-w-[600px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
          x: [0, -30, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] max-w-[500px] rounded-full bg-tomato-burst/10 blur-[100px] pointer-events-none z-0" 
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="content-container flex flex-col items-center text-center relative z-20 w-full"
      >
        {/* Hype Intro Badge */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-white/5 backdrop-blur-xl text-amber-200 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/10">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Legacy Catering • Putrajaya MOF</span>
            <span className="w-1 h-1 rounded-full bg-amber-400/40" />
            <span className="opacity-70">Est. 1986</span>
          </div>
        </motion.div>

        {/* 3D Interactive Logo Focal Point */}
        <motion.div 
          variants={itemVariants}
          className="mb-10 transform-gpu"
        >
          <CinematicLogoLayers sizeClassName="h-32 w-32 sm:h-40 sm:w-40 md:h-52 md:w-52" />
        </motion.div>

        {/* High-Impact Headline */}
        <motion.h1 
          variants={itemVariants}
          className="relative font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white mb-6 tracking-tighter leading-[0.9] text-balance"
        >
          <span className="block opacity-90">{t('hero_title_line1') || 'RASA'}</span>
          <span className="block mt-1">
            <GlitchText text={t('hero_glitch')} className="scale-110" />
          </span>
          <span className="block mt-1 opacity-90 italic font-heritage text-amber-100/40 translate-x-4">
            {t('hero_title_line2') || 'SEMPURNA'}
          </span>
        </motion.h1>
        
        {/* Refined Description */}
        <motion.p 
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-amber-50/80 max-w-xl mx-auto font-medium mb-10 leading-relaxed drop-shadow-sm"
        >
          {t('hero_description')}
        </motion.p>
        
        {/* Hype Action Cluster */}
        <motion.div 
          variants={itemVariants} 
          className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto px-6 sm:px-0"
        >
          <a 
            href="#menu" 
            className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-white text-charcoal rounded-2xl font-black text-sm md:text-base overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-white to-amber-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <UtensilsCrossed className="relative z-10 w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="relative z-10">{t('explore_menu_btn')}</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          
          <Link 
            to="/order" 
            className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-charcoal/40 backdrop-blur-3xl border border-white/10 text-white rounded-2xl font-bold text-sm md:text-base overflow-hidden transition-all duration-300 hover:bg-charcoal/60 hover:border-white/30 active:scale-95"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10">{t('order_catering_btn')}</span>
          </Link>
        </motion.div>

        {/* Trust Indicator Scroll Hint */}
        <motion.div 
          variants={itemVariants}
          className="mt-16 sm:mt-24 opacity-30 flex flex-col items-center gap-4"
        >
          <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('scroll_explore') || 'SCROLL TO TASTE'}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

