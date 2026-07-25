import { Award } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getAssetUrl } from '@/lib/utils';
import { motion } from 'motion/react';

export default function StorySection() {
  const { t, language } = useLanguage();
  
  const STATS = [
    { number: '1986', label: t('established') },
    { number: '40+', label: t('years_service') },
    { number: '4.9', label: t('star_rating') },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="story" className="section-padding bg-cream relative">
      <div className="content-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
          
          <motion.div 
            className="lg:col-span-5 order-2 lg:order-1"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={imageVariants}
          >
            <div className="relative max-w-md mx-auto lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden aspect-[16/9] border border-deep-forest/[0.03] dark:border-white/5 shadow-premium bg-white dark:bg-card flex items-center justify-center">
                <img 
                  src={getAssetUrl("/assets/high-tea.jpg")} 
                  alt={language === 'bm' ? 'Kotak Katering Minum Petang' : 'High-Tea Catering Box'} 
                  loading="lazy"
                  className="w-full h-full object-contain p-4"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getAssetUrl('/assets/wawasan_logo.jpg');
                  }}
                />
              </div>
              
              <div className="absolute -bottom-8 -right-4 sm:-right-8 bg-white/95 dark:bg-card/95 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl hidden sm:block max-w-[280px]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-sunshine/10 flex items-center justify-center border border-sunshine/10">
                    <Award className="w-6 h-6 text-sunshine" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </div>
                  <div>
                    <p className="font-display font-medium text-deep-forest text-base leading-tight mb-1">
                      {language === 'bm' ? 'Halal & mesra keluarga' : 'Halal & family-friendly'}
                    </p>
                    <p className="text-[11px] text-deep-forest/50 uppercase tracking-[0.1em] font-semibold">
                      {language === 'bm' ? 'Sarapan, makan tengah hari, katering' : 'Breakfast, lunch, catering'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="lg:col-span-7 order-1 lg:order-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="flex justify-start mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-xs font-semibold text-deep-forest/80 uppercase tracking-[0.2em]">
                  {t('our_story')}
                </span>
              </div>
            </motion.div>
            
            <motion.h2 variants={itemVariants} className="font-display font-bold text-[40px] md:text-[56px] text-deep-forest leading-[1.05] mb-8">
              {t('story_title')}
            </motion.h2>
            
            <div className="space-y-6 mb-12">
              <motion.p variants={itemVariants} className="font-body text-lg text-deep-forest/70 leading-relaxed font-light">
                {t('story_p1')}
              </motion.p>
              <motion.p variants={itemVariants} className="font-body text-lg text-deep-forest/70 leading-relaxed font-light">
                {t('story_p2')}
              </motion.p>
              <motion.p variants={itemVariants} className="font-body text-lg text-deep-forest/70 leading-relaxed font-light">
                {t('story_p3')}
              </motion.p>
            </div>
            
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-8 border-t border-white/10 pt-10">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <span className="font-display font-bold text-4xl text-sunshine">
                    {stat.number}
                  </span>
                  <span className="block font-sans font-medium text-[11px] uppercase tracking-[0.1em] text-deep-forest/50 mt-3">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
