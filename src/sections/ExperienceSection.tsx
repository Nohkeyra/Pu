import { Sparkles, Heart, Flame, HandHeart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'motion/react';

const PRINCIPLES = [
  {
    icon: Sparkles,
    name: 'Cleanliness',
    malayName: 'Kebersihan',
    descriptionEn: 'Impeccable standards in every corner. A spotless environment for your dining comfort.',
    descriptionBm: 'Standard tanpa cela di setiap sudut. Persekitaran yang bersih untuk keselesaan menjamu selera anda.',
  },
  {
    icon: Heart,
    name: 'Excellent Service',
    malayName: 'Servis Terbaik',
    descriptionEn: 'Warm, attentive hospitality that makes every guest feel like family.',
    descriptionBm: 'Layanan yang mesra dan penuh perhatian yang membuatkan setiap tetamu merasa seperti keluarga.',
  },
  {
    icon: Flame,
    name: 'Lasting Taste',
    malayName: 'Rasa Kekal',
    descriptionEn: 'Recipes perfected over decades, delivering unforgettable flavors in every bite.',
    descriptionBm: 'Resipi yang disempurnakan berdekad-dekad lamanya, memberikan rasa yang tidak dapat dilupakan.',
  },
  {
    icon: HandHeart,
    name: 'Affordable Prices',
    malayName: 'Harga Berpatutan',
    descriptionEn: 'Exceptional quality at prices that welcome everyone — from ministers to families.',
    descriptionBm: 'Kualiti luar biasa pada harga yang mengalu-alukan semua orang — dari menteri hingga keluarga.',
  },
];

export default function ExperienceSection() {
  const { language, t } = useLanguage();

  const headerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const headerItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const gridVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="experience" className="section-padding bg-cream dark:bg-background relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="content-container">
        
        <motion.div 
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="text-center mb-20"
        >
          <motion.div variants={headerItemVariants} className="flex justify-center mb-4">
            <div className="section-subtitle-artistic">
              {t('experience_title')}
            </div>
          </motion.div>
          <motion.h2 variants={headerItemVariants} className="section-title-artistic">
            {t('more_than_meal')}
          </motion.h2>
          <motion.p variants={headerItemVariants} className="font-body text-lg text-deep-forest/70 leading-relaxed max-w-[600px] mx-auto font-light">
            {t('experience_p1')}
          </motion.p>
        </motion.div>

        <motion.div 
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <motion.div 
                key={p.name} 
                variants={cardVariants}
                className="principle-card group bg-cream-dark/60 backdrop-blur-md rounded-3xl p-8 border border-deep-forest/[0.06] dark:border-white/[0.06] hover:border-[var(--color-sunshine-cta)]/30 hover:shadow-[0_20px_50px_rgba(246,153,19,0.12)] hover:-translate-y-1 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-deep-forest/[0.04] dark:bg-white/5 border border-deep-forest/10 dark:border-white/10 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[var(--color-sunshine-cta)] group-hover:border-[var(--color-sunshine-cta)] transition-all duration-500">
                  <Icon className="w-6 h-6 text-[var(--color-sunshine-cta)] group-hover:text-deep-forest transition-colors" />
                </div>
                <h3 className="font-display font-bold text-xl text-deep-forest mb-1">
                  {language === 'bm' ? p.malayName : p.name}
                </h3>
                <p className="text-sm font-body font-light text-deep-forest/70 leading-relaxed mt-4">
                  {language === 'bm' ? p.descriptionBm : p.descriptionEn}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
