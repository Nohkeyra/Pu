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
      className: "md:col-span-2 md:row-span-1",
      accent: "from-amber-500/10 to-transparent",
      iconColor: "text-amber-500"
    },
    {
      icon: UtensilsCrossed,
      title: isBm ? 'Mesyuarat & Katering' : 'Meeting Packs & Catering',
      subtitle: isBm ? 'Sesuai untuk pejabat, agensi dan acara.' : 'Built for offices, agencies and events.',
      className: "md:col-span-1 md:row-span-2",
      accent: "from-emerald-500/10 to-transparent",
      iconColor: "text-emerald-500"
    },
    {
      icon: MapPin,
      title: isBm ? 'Di Tengah Putrajaya' : 'In the Heart of Putrajaya',
      subtitle: isBm ? 'Aras B3, Menara PjH, Presint 2.' : 'Level B3, Menara PjH, Presint 2.',
      className: "md:col-span-2 md:row-span-1",
      accent: "from-tomato-burst/10 to-transparent",
      iconColor: "text-tomato-burst"
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      },
    },
  };

  return (
    <section className="py-24 bg-cream dark:bg-charcoal relative z-20 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-amber-500/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="content-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 lg:gap-6"
        >
          {highlights.map((item) => {
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                className={`group relative overflow-hidden p-8 rounded-[2rem] bg-white/50 dark:bg-card/40 backdrop-blur-xl border border-charcoal/5 dark:border-white/5 transition-all duration-500 hover:shadow-2xl hover:shadow-charcoal/5 dark:hover:shadow-black/20 ${item.className}`}
              >
                {/* Accent Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                
                {/* Background Pattern */}
                <div className="absolute right-[-2%] bottom-[-2%] w-32 h-32 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                  <Icon className="w-full h-full" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white dark:bg-charcoal/50 shadow-sm border border-charcoal/5 dark:border-white/5 mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${item.iconColor}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  
                  <div>
                    <h3 className="font-artistic text-2xl lg:text-3xl text-charcoal dark:text-white leading-[1.1] mb-3 tracking-tighter">
                      {item.title}
                    </h3>
                    <p className="text-sm lg:text-base text-deep-forest/85 dark:text-[#ede5d8]/85 leading-relaxed font-normal max-w-[80%]">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
