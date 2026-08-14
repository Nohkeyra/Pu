import { Coffee, MapPin, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'motion/react';

export default function HighlightsSection() {
  const { language } = useLanguage();
  const isBm = language === 'bm';

  const highlights = [
    {
      icon: Coffee,
      title: isBm ? 'Sarapan Legenda' : 'Legendary Breakfast',
      subtitle: isBm ? 'Lontong, soto, teh tarik dan banyak lagi.' : 'Lontong, soto, teh tarik and more.',
    },
    {
      icon: UtensilsCrossed,
      title: isBm ? 'Mesyuarat & Katering' : 'Meeting Packs & Catering',
      subtitle: isBm ? 'Sesuai untuk pejabat, agensi dan acara.' : 'Built for offices, agencies and events.',
    },
    {
      icon: MapPin,
      title: isBm ? 'Di Tengah Putrajaya' : 'In the Heart of Putrajaya',
      subtitle: isBm ? 'Bangunan Kementerian Kewangan (MoF), Presint 2.' : 'Ministry of Finance Building (MoF), Presint 2.',
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section className="py-12 md:py-16 bg-cream dark:bg-charcoal/95 relative z-20">
      <div className="content-container">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {highlights.map((item, index) => {
            const Icon = item.icon;
            const accentColors = [
              'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
              'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
              'border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400'
            ];
            const currentAccent = accentColors[index % accentColors.length];
            
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                className="group relative p-6 rounded-3xl bg-white/80 dark:bg-card/90 backdrop-blur-md border border-amber-500/15 dark:border-white/10 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/5 flex items-start gap-4 overflow-hidden"
              >
                {/* Decorative Background Icon */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.04] group-hover:opacity-[0.09] transition-opacity duration-500 rotate-12">
                  <Icon className="w-full h-full" />
                </div>

                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border ${currentAccent} shadow-sm transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105`}>
                  <Icon className="w-7 h-7" />
                </div>
                
                <div className="relative z-10">
                  <h3 className="font-display font-black text-lg text-deep-forest dark:text-amber-100 leading-tight mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone dark:text-stone/70 leading-relaxed font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
