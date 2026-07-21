import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

const MENU_ITEMS = [
  {
    nameEn: 'Asam Pedas',
    nameBm: 'Asam Pedas',
    descEn: 'Our #1 crowd favorite — spicy tamarind fish stew with tangy, bold flavors. A true Malay classic.',
    descBm: 'Kegemaran ramai #1 — rebusan ikan asam pedas dengan rasa masam dan berani yang ketara. Klasik Melayu sejati.',
    priceEn: 'From RM 8',
    priceBm: 'Daripada RM 8',
    image: `/assets/asam-pedas.jpg`,
  },
  {
    nameEn: 'Nasi Lemak',
    nameBm: 'Nasi Lemak',
    descEn: "Malaysia's national dish — fragrant coconut rice with sambal, anchovies, peanuts, cucumber & egg.",
    descBm: 'Hidangan kebangsaan Malaysia — nasi santan wangi bersama sambal, ikan bilis, kacang tanah, timun & telur.',
    priceEn: 'From RM 3',
    priceBm: 'Daripada RM 3',
    image: `/assets/nasi-lemak.jpg`,
  },
  {
    nameEn: 'Lontong Singapore',
    nameBm: 'Lontong Singapore',
    descEn: 'Compressed rice cakes in rich coconut vegetable curry with cabbage, long beans, and sambal.',
    descBm: 'Nasi himpit di dalam kuah lodeh sayur bersantan pekat bersama kuubisan, kacang panjang, dan sambal.',
    priceEn: 'From RM 7',
    priceBm: 'Daripada RM 7',
    image: `/assets/lontong-singapore.jpg`,
  },
  {
    nameEn: 'Mee Soto',
    nameBm: 'Mee Soto',
    descEn: 'Aromatic chicken noodle soup with shredded chicken, bean sprouts, and crispy fried shallots.',
    descBm: 'Sup mi ayam aromatik bersama carikan isi ayam, taugeh, dan bawang goreng garing.',
    priceEn: 'From RM 6',
    priceBm: 'Daripada RM 6',
    image: `/assets/mee-soto.jpg`,
  },
  {
    nameEn: 'Soto Ayam',
    nameBm: 'Soto Ayam',
    descEn: 'Rich, spiced chicken broth served with compressed rice cubes (nasi impit) and potato croquette.',
    descBm: 'Sup ayam berempah pekat dihidang bersama nasi himpit dan bergedil kentang.',
    priceEn: 'From RM 6',
    priceBm: 'Daripada RM 6',
    image: `/assets/soto-ayam.jpg`,
  },
  {
    nameEn: 'Nasi Campur',
    nameBm: 'Nasi Campur',
    descEn: 'Mixed rice with your choice of daily freshly cooked dishes, from curries to stir-fried greens.',
    descBm: 'Nasi putih berlauk dengan pilihan hidangan segar harian, dari kari hingga sayur tumis.',
    priceEn: 'Various',
    priceBm: 'Pelbagai',
    image: `/assets/nasi-campur.jpg`,
  },
  {
    nameEn: 'Teh Tarik',
    nameBm: 'Teh Tarik',
    descEn: 'Classic Malaysian pulled black tea with sweet condensed milk, frothed to perfection.',
    descBm: 'Teh tarik hitam klasik Malaysia dengan susu pekat manis, berbuih sempurna.',
    priceEn: 'From RM 2.50',
    priceBm: 'Daripada RM 2.50',
    image: `/assets/teh-tarik.jpg`,
  },
  {
    nameEn: 'Kopi 434 Kopi Kampung',
    nameBm: 'Kopi 434 Kopi Kampung',
    descEn: 'Classic rich, dark roasted Malaysian village black coffee, served sweet and aromatic.',
    descBm: 'Kopi kampung hitam panggang klasik Malaysia yang pekat dan harum, dihidangkan manis aromatik.',
    priceEn: 'From RM 2.80',
    priceBm: 'Daripada RM 2.80',
    image: `/assets/kopi_kampung.jpg`,
  },
];

export default function MenuSection() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isBm = language === 'bm';
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState(MENU_ITEMS);

  useEffect(() => {
    // Basic localStorage caching strategy for menu items
    const cachedItems = localStorage.getItem('menu_items');
    if (cachedItems) {
      setMenuItems(JSON.parse(cachedItems));
    } else {
      localStorage.setItem('menu_items', JSON.stringify(MENU_ITEMS));
    }

    // Simulate loading menu items
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 850);
    return () => clearTimeout(timer);
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
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
          {isLoading ? (
            // Render beautiful skeleton cards during loading
            Array.from({ length: 6 }).map((_, idx) => (
              <motion.div 
                key={idx} 
                variants={cardVariants}
                className="menu-card relative bg-cream-dark/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/[0.06] p-0 flex flex-col h-full"
              >
                <div className="aspect-[4/3] w-full relative overflow-hidden">
                  <Skeleton className="w-full h-full rounded-t-[2.5rem]" />
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1 bg-transparent">
                  <Skeleton className="h-7 w-1/2 rounded-md mb-4" />
                  <div className="space-y-2 mb-6">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-11/12 rounded" />
                    <Skeleton className="h-4 w-4/5 rounded" />
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-auto">
                    <Skeleton className="h-5 w-1/4 rounded" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            menuItems.map((item) => (
              <motion.div 
                key={item.nameEn} 
                variants={cardVariants}
                className="menu-card group relative bg-white dark:bg-card rounded-3xl overflow-hidden border border-deep-forest/[0.03] dark:border-white/5 hover:border-sunshine/30 hover:shadow-premium transition-all duration-500"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={isBm ? item.nameBm : item.nameEn}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-forest/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                  <div className="flex items-center gap-4 border-t border-deep-forest/5 dark:border-white/5 pt-5">
                    <span className="font-sans font-black text-sunshine text-lg">
                      {isBm ? item.priceBm : item.priceEn}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Order Now (Guest/Direct Order) Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mt-16 text-center max-w-2xl mx-auto px-4"
        >
          <div className="bg-cream-dark/60 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-white/[0.08] shadow-xl relative overflow-hidden group">
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
