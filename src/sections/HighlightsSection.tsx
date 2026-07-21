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
      subtitle: isBm ? 'Menara PjH dengan suasana tasik yang indah.' : 'Menara PjH with a scenic lakeside feel.',
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
    <section className="py-12 md:py-16 bg-cream relative z-20">
      <div className="content-container">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {highlights.map((item, index) => {
            const Icon = item.icon;
            const accentColors = [
              'border-sunshine/20 bg-sunshine/[0.03] text-sunshine',
              'border-kiwi/20 bg-kiwi/[0.03] text-kiwi',
              'border-stone/20 bg-stone/[0.03] text-stone'
            ];
            const currentAccent = accentColors[index % accentColors.length];
            
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                className={`group relative p-5 rounded-2xl border ${currentAccent.split(' ')[0]} ${currentAccent.split(' ')[1]} transition-all duration-500 hover:scale-[1.02] flex items-start gap-4 overflow-hidden shadow-sm hover:shadow-md`}
              >
                {/* Decorative Background Icon */}
                <div className="absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rotate-12">
                  <Icon className="w-full h-full" />
                </div>

                <div className={`w-12 h-12 shrink-0 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] flex items-center justify-center border ${currentAccent.split(' ')[0]} bg-white dark:bg-card shadow-sm transition-transform duration-500 group-hover:rotate-6`}>
                  <Icon className={`w-6 h-6 ${currentAccent.split(' ')[2]}`} />
                </div>
                
                <div className="relative z-10">
                  <h3 className="font-display font-black text-base text-deep-forest  leading-tight mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone dark:text-stone/60 leading-relaxed font-medium">
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
