
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
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
    <section className="relative w-full overflow-hidden bg-[#0a1c18] dark:bg-[#0c100e] pt-32 pb-24 min-h-[100dvh] flex flex-col justify-center items-center">
      {/* Cinematic Deep Dark Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a1c18] dark:bg-[#0c100e]">
        <motion.div 
          style={{ y: smoothY, opacity, scale }} 
          className="absolute inset-0"
        >
          <Batik3DMotion
            mode="background"
            src={getAssetUrl('/assets/batik_vector_pattern.jpg')}
            backgroundSize="cover"
            maxRotation={15}
            imgClassName="opacity-20 dark:opacity-[0.06] mix-blend-overlay transition-opacity duration-700 pointer-events-none"
          />
        </motion.div>
        
        {/* Dynamic Atmospheric Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1c18]/90 via-[#0a1c18]/60 to-[#0a1c18] dark:from-[#0c100e]/95 dark:via-[#0c100e]/75 dark:to-[#0c100e] z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0c453c]/30 via-transparent to-amber-950/20 dark:from-[#151d1a]/40 dark:to-transparent z-0 pointer-events-none" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pattern-dots opacity-10 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_90%)] pointer-events-none" />
        
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
        className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] max-w-[450px] rounded-full bg-[#bf4a03]/10 blur-[100px] pointer-events-none z-0" 
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="content-container flex flex-col items-center text-center relative z-20 w-full"
      >
        {/* 3D Interactive Logo Focal Point */}
        <motion.div 
          variants={itemVariants}
          className="mb-8 transform-gpu"
        >
          <CinematicLogoLayers sizeClassName="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48" />
        </motion.div>

        {/* Unified Brand Headline */}
        <motion.div variants={itemVariants} className="mb-6 max-w-4xl">
          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white dark:text-[#ede5d8] tracking-tight leading-[1.05] text-balance drop-shadow-md">
            {t('hero_title') || 'Restoran Wawasan'}
          </h1>
        </motion.div>
        
        {/* Refined Description */}
        <motion.p 
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-[#ede5d8]/80 dark:text-[#9d988f] max-w-xl mx-auto font-medium mb-10 leading-relaxed drop-shadow-sm"
        >
          {t('hero_description')}
        </motion.p>
        
        {/* Action Cluster */}
        <motion.div 
          variants={itemVariants} 
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-6 sm:px-0"
        >
          <a 
            href="#menu" 
            className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-[#bf4a03] hover:bg-[#d15605] text-[#ede5d8] rounded-2xl font-bold text-base overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-[#bf4a03]/25"
          >
            <UtensilsCrossed className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span>{t('explore_menu_btn')}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          
          <Link 
            to="/order" 
            className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-[#1c2622] hover:bg-[#26312d] border border-[#ede5d8]/20 hover:border-[#e99508]/40 text-[#ede5d8] rounded-2xl font-bold text-base overflow-hidden transition-all duration-300 active:scale-95 shadow-md"
          >
            <span>{t('order_catering_btn')}</span>
          </Link>
        </motion.div>

        {/* Scroll Hint */}
        <motion.div 
          variants={itemVariants}
          className="mt-16 sm:mt-20 opacity-60 flex flex-col items-center gap-3 text-[#9d988f]"
        >
          <div className="w-px h-10 bg-gradient-to-b from-[#e99508]/60 to-transparent" />
          <span className="text-[11px] font-bold uppercase tracking-[0.25em]">{t('scroll_explore')}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

