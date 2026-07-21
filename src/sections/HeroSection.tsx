
import { motion, useScroll, useTransform } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import GlitchText from '@/components/GlitchText';

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
    <section className="relative w-full overflow-hidden bg-cream pt-20 pb-16 h-[65vh] sm:h-[75vh] md:h-[80vh] lg:h-[85vh] min-h-[500px] flex flex-col justify-center items-center">
      {/* Food-Centric Backdrop */}
      <div className="absolute top-0 left-0 right-0 w-full h-full z-0 overflow-hidden bg-charcoal">
        <motion.img
          src={getAssetUrl("/assets/batik_pattern.jpg")}
          alt="Elegant Batik Pattern Background"
          style={{ y, scale: 1.05 }}
          fetchPriority="high"
          className="w-full h-full object-cover object-center filter opacity-45 dark:opacity-35 transition-all duration-700 ease-in-out"
          referrerPolicy="no-referrer"
        />
        {/* Warm Overlay & Contrast Protection */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/60 z-0" />
        {/* Deep, seamless bottom fade-out to page background */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cream to-transparent z-10 pointer-events-none" />
        {/* Geometric Star Pattern Overlay */}
        <div className="absolute inset-0 pattern-dots opacity-25" />
      </div>

      {/* Decorative ambient radial glows */}
      <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-sunshine/30 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] rounded-full bg-crisp-carrot/20 blur-[130px] pointer-events-none" />

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

      {/* Curved Bottom Wave/Divider - Seamlessly transitions colors in light & dark modes */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0] z-20 pointer-events-none">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="relative block w-[calc(100%+1.3px)] h-[35px] md:h-[55px] fill-cream transition-colors duration-300"
        >
          <path d="M0,0 C150,90 350,120 600,100 C850,80 1050,90 1200,0 L1200,120 L0,120 Z" />
        </svg>
      </div>
    </section>
  );
}
