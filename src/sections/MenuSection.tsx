import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { getAssetUrl } from '@/lib/utils';
import { MENU_ITEMS } from '@/data/menu';
import ResponsiveImage from '@/components/ResponsiveImage';


export default function MenuSection() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isBm = language === 'bm';
  const [menuItems, setMenuItems] = useState(MENU_ITEMS);

  useEffect(() => {
    // Basic localStorage caching strategy for menu items
    const cachedItems = localStorage.getItem('menu_items');
    if (cachedItems) {
      try {
        const parsed = JSON.parse(cachedItems);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated = parsed.map((item: any) => {
            const defaultItem = MENU_ITEMS.find((m) => m.id === item.id);
            if (defaultItem) {
              return { ...item, image: defaultItem.image };
            }
            return item;
          });
          setMenuItems(validated);
          localStorage.setItem('menu_items', JSON.stringify(validated));
        } else {
          setMenuItems(MENU_ITEMS);
        }
      } catch {
        setMenuItems(MENU_ITEMS);
      }
    } else {
      localStorage.setItem('menu_items', JSON.stringify(MENU_ITEMS));
    }
  }, []);

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
        staggerChildren: 0.08,
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
    <section id="menu" className="section-padding bg-cream relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="content-container">
        
        <motion.div 
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="text-center mb-16"
        >
          <motion.div variants={headerItemVariants} className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-deep-forest/[0.04] dark:bg-white/5 border border-deep-forest/10 dark:border-white/10">
              <span className="text-xs font-semibold text-deep-forest/80 uppercase tracking-[0.2em]">
                {t('our_menu')}
              </span>
            </div>
          </motion.div>
          <motion.h2 variants={headerItemVariants} className="font-display font-bold text-[40px] md:text-[56px] text-deep-forest leading-[1.05] mb-6">
            {t('menu_title')}
          </motion.h2>
          <motion.p variants={headerItemVariants} className="font-body text-lg text-deep-forest/70 leading-relaxed max-w-[600px] mx-auto font-light">
            {t('menu_subtitle')}
          </motion.p>
        </motion.div>

        <motion.div 
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {menuItems.map((item) => (
              <motion.div 
                key={item.nameEn} 
                variants={cardVariants}
                className="menu-card group relative bg-white dark:bg-card rounded-3xl overflow-hidden border border-deep-forest/[0.03] dark:border-white/5 hover:border-sunshine/30 hover:shadow-premium transition-all duration-500"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <ResponsiveImage
                    src={item.image}
                    alt={isBm ? item.nameBm : item.nameEn}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    containerClassName="w-full h-full"
                    className="group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sunshine/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-7 md:p-8 relative">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-display font-black text-2xl text-sunshine group-hover:scale-[1.02] transition-transform duration-300">
                      {isBm ? item.nameBm : item.nameEn}
                    </h3>
                  </div>
                  <p className="font-body text-stone dark:text-stone/70 leading-relaxed mb-6 font-light text-sm h-[60px] overflow-hidden line-clamp-3">
                    {isBm ? item.descBm : item.descEn}
                  </p>
                  <div className="relative mt-auto overflow-hidden rounded-2xl bg-gradient-to-r from-[#023341] via-[#0B4A5C] to-[#023341] dark:from-[#3b2116] dark:via-[#54301f] dark:to-[#3b2116] border border-sunshine/30 dark:border-sunshine/60 p-4 flex items-center justify-between shadow-md group-hover:border-sunshine/80 transition-all duration-300">
                    {/* Authentic Non-Repeating Malaysian Batik Overlay */}
                    <div 
                      className="absolute inset-0 opacity-35 dark:opacity-50 pointer-events-none transition-opacity duration-300 group-hover:opacity-65 mix-blend-overlay dark:mix-blend-soft-light"
                      style={{
                        backgroundImage: `url(${getAssetUrl('/assets/batik_pattern_hd.jpg')})`,
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <span className="text-[11px] font-black text-sunshine dark:text-amber-200 uppercase tracking-widest drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]">
                        {isBm ? 'Harga Bermula' : 'Price Starts'}
                      </span>
                      <span className="font-sans font-black text-white dark:text-amber-50 text-base drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300">
                        {isBm ? item.priceBm : item.priceEn}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
        </motion.div>

        {/* Order Now (Guest/Direct Order) Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mt-16 text-center max-w-2xl mx-auto px-4"
        >
          <div className="bg-cream-dark/60 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-deep-forest/[0.08] dark:border-white/[0.08] shadow-xl relative overflow-hidden group">
            {/* Ambient decorative gradient */}
            <div className="absolute -inset-px bg-gradient-to-r from-sunshine/5 to-crisp-carrot/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <h3 className="font-display font-bold text-2xl md:text-3xl text-deep-forest mb-3">
              {isBm ? 'Sedia untuk Memesan?' : 'Ready to Order?'}
            </h3>
            <p className="font-body text-deep-forest/70 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
              {isBm 
                ? 'Sama ada sebagai ahli atau pelawat biasa, langkau pendaftaran dan buat pesanan katering anda secara terus.' 
                : 'Skip registration entirely and place your catering order directly as a guest.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/order')}
                className="w-full sm:w-auto px-10 py-4.5 bg-sunshine text-white font-black rounded-2xl shadow-sunshine-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group-hover:scale-[1.02]"
              >
                <ShoppingBag className="w-5 h-5" />
                {isBm ? 'Pesan Sekarang (Pelawat)' : 'Order Now (Guest)'}
                <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
