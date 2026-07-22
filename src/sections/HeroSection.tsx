
import { motion, useScroll, useTransform } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import GlitchText from '@/components/GlitchText';
import { Batik3DMotion } from '@/components/Batik3DMotion';

export default function HeroSection() {
  const { language } = useLanguage();
  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);
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
    <section className="relative w-full overflow-hidden bg-cream dark:bg-charcoal pt-20 pb-16 h-[65vh] sm:h-[75vh] md:h-[80vh] lg:h-[85vh] min-h-[500px] flex flex-col justify-center items-center">
      {/* Food-Centric Backdrop */}
      <div className="absolute top-0 left-0 right-0 w-full h-full z-0 overflow-hidden bg-deep-forest dark:bg-charcoal transition-colors duration-300">
        <motion.div 
          style={{ y }} 
          className="absolute -top-36 -bottom-36 -left-16 -right-16"
        >
          <Batik3DMotion
            maxRotation={16}
            imgClassName="opacity-75 dark:opacity-35 transition-opacity duration-300"
            maskImage="linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.5) 70%, transparent 95%)"
          />
        </motion.div>
        {/* Warm Overlay & Contrast Protection - Lighter in Day Mode, deep dark charcoal in Night Mode */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-deep-forest/80 dark:from-black/80 dark:via-black/50 dark:to-charcoal/95 z-0 transition-all duration-300" />
        {/* Geometric Star Pattern Overlay with smooth straight bottom mask */}
        <div className="absolute inset-0 pattern-dots opacity-15 pointer-events-none [mask-image:linear-gradient(to_bottom,black_30%,transparent_85%)]" />

        {/* Straight horizontal gradient dissolve replacing the wavy curve */}
        <div className="absolute inset-x-0 bottom-0 h-32 sm:h-48 md:h-60 bg-gradient-to-b from-transparent via-deep-forest/20 to-cream dark:via-charcoal/60 dark:to-charcoal z-10 pointer-events-none transition-colors duration-300" />
      </div>

      {/* Decorative ambient radial glows */}
      <div className="absolute top-[15%] left-[10%] w-[35vw] h-[35vw] rounded-full bg-sunshine/20 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-crisp-carrot/15 blur-[120px] pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="content-container flex flex-col items-center text-center relative z-20 w-full py-12 md:py-16"
      >
        <motion.h1 
          variants={itemVariants}
          className="font-display font-bold text-4xl md:text-6xl lg:text-7xl text-white mb-4 drop-shadow-lg"
        >
          <GlitchText text={t('Sincerity . Blessings', 'Keikhlasan . Keberkatan')} />
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium mb-8 drop-shadow-md"
        >
          {t('Experience the true taste of heritage at Restoran Wawasan. Est. 1986.', 'Alami rasa warisan sebenar di Restoran Wawasan. Sejak 1986.')}
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-6 sm:px-0">
          <a href="#menu" className="px-10 py-4 bg-sunshine text-white rounded-2xl font-black text-sm md:text-base hover:brightness-110 transition-all shadow-xl hover:shadow-sunshine-glow hover:-translate-y-1 flex items-center justify-center">
            {t('Explore Menu', 'Lihat Menu')}
          </a>
          <a href="/#/order" className="px-10 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-bold text-sm md:text-base hover:bg-white/20 transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center">
            {t('Order Catering', 'Tempah Katering')}
          </a>
        </motion.div>

      </motion.div>
    </section>
  );
}
