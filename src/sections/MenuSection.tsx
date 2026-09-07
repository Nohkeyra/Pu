import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { MENU_ITEMS, type FeaturedMenuItem } from '@/constants/menu';
import ResponsiveImage from '@/components/ResponsiveImage';
import { HungryButton } from '@/components/ui/HungryButton';
import { UtensilsCrossed, Sparkles, Coffee, Flame, ChevronRight } from 'lucide-react';
import { triggerLightImpact } from '@/lib/haptics';

// 3D Parallax Tilt Card for Menu Items with seamless dark framing
const TiltCard = React.memo(({ item, isBm, cardVariants, onOrderClick }: { 
  item: FeaturedMenuItem; 
  isBm: boolean; 
  cardVariants: any;
  onOrderClick: () => void;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Determine badge styling based on item characteristics
  const getBadgeInfo = () => {
    if (item.tags?.includes('signature') || item.id === 'asam-pedas') {
      return { text: isBm ? 'Paling Laris #1' : '#1 Best Seller', icon: '✦', color: 'text-amber-300 border-amber-400/40 bg-stone-950/70' };
    }
    if (item.tags?.includes('classic') || item.id === 'nasi-lemak') {
      return { text: isBm ? 'Sajian Warisan' : 'Heritage Dish', icon: '★', color: 'text-emerald-300 border-emerald-400/40 bg-stone-950/70' };
    }
    if (item.category === 'drinks') {
      return { text: isBm ? 'Minuman Kaw' : 'Signature Drink', icon: '☕', color: 'text-amber-200 border-amber-400/30 bg-stone-950/70' };
    }
    return { text: isBm ? 'Pilihan Ramai' : 'Popular Pick', icon: '✦', color: 'text-amber-300 border-amber-400/30 bg-stone-950/70' };
  };

  const badge = getBadgeInfo();

  return (
    <div style={{ perspective: 1200 }} className="relative h-full">
      <motion.div 
        variants={cardVariants}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="menu-card group relative bg-white dark:bg-stone-900 rounded-[1.75rem] overflow-hidden border border-stone-200/90 dark:border-stone-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 shadow-md hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 z-10 flex flex-col h-full justify-between"
      >
        {/* Subtle background batik watermark */}
        <div className="absolute inset-0 batik-watermark opacity-20 dark:opacity-[0.04] pointer-events-none" />

        {/* Top Image Container with Seamless Dark Gradient Transition */}
        <div>
          <div className="aspect-[4/3] overflow-hidden relative rounded-t-[1.75rem] bg-stone-950" style={{ transform: 'translateZ(30px)' }}>
            <ResponsiveImage
              src={item.image || ''}
              alt={isBm ? item.nameBm : item.nameEn}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              containerClassName="w-full h-full"
              className="group-hover:scale-108 transition-transform duration-700 object-cover"
            />
            {/* Seamless Dark Bottom Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-transparent pointer-events-none" />
            
            {/* Magazine-Style Floating Glassmorphism Badge */}
            <div className="absolute top-3.5 left-3.5 z-10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg border ${badge.color}`}>
                <span>{badge.icon}</span>
                <span className="whitespace-nowrap">{badge.text}</span>
              </span>
            </div>
          </div>

          {/* Card Content & Normalized Typography */}
          <div className="p-5 sm:p-6 relative" style={{ transform: 'translateZ(45px)' }}>
            <h3 className="font-display font-black text-lg sm:text-xl text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300 mb-1.5 line-clamp-1 tracking-tight">
              {isBm ? item.nameBm : item.nameEn}
            </h3>
            <p className="font-body text-stone-600 dark:text-stone-300 leading-relaxed font-normal text-xs sm:text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
              {isBm ? item.descBm : item.descEn}
            </p>
          </div>
        </div>

        {/* Card Footer: Price Box & Ergonomic Action Target */}
        <div className="p-5 sm:p-6 pt-0 relative mt-auto" style={{ transform: 'translateZ(60px)' }}>
          <div 
            onClick={onOrderClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOrderClick();
              }
            }}
            className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 border border-amber-400/40 p-3 flex items-center justify-between shadow-md shadow-amber-500/15 group-hover:border-amber-400/80 transition-all duration-300 min-h-[44px] active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {/* Authentic Malaysian Batik Overlay */}
            <div 
              className="absolute inset-0 opacity-30 dark:opacity-40 pointer-events-none transition-opacity duration-300 group-hover:opacity-60 mix-blend-overlay"
              style={{
                backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern_hd.jpg')})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-amber-100 uppercase tracking-widest leading-none">
                  {isBm ? 'Harga Bermula' : 'Price Starts'}
                </span>
                <span className="font-sans font-black text-white text-base sm:text-lg leading-tight mt-0.5 drop-shadow-sm">
                  {isBm ? item.priceBm : item.priceEn}
                </span>
              </div>
              <div className="flex items-center gap-1 text-white font-bold text-xs uppercase tracking-wider bg-black/20 hover:bg-black/30 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-white/20 transition-colors">
                <span>{isBm ? 'Pesan' : 'Order'}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default function MenuSection() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isBm = language === 'bm';
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => [
    { id: 'all', labelBm: 'Semua Sajian', labelEn: 'All Dishes', icon: UtensilsCrossed },
    { id: 'mains', labelBm: 'Hidangan Utama', labelEn: 'Signature Mains', icon: Flame },
    { id: 'breakfast', labelBm: 'Sarapan & Soto', labelEn: 'Breakfast & Soups', icon: Sparkles },
    { id: 'drinks', labelBm: 'Minuman Warisan', labelEn: 'Heritage Drinks', icon: Coffee },
  ], []);

  const filteredMenuItems = useMemo(() => {
    if (activeCategory === 'all') return MENU_ITEMS;
    if (activeCategory === 'mains') {
      return MENU_ITEMS.filter(item => item.category === 'lunch' || item.id === 'asam-pedas' || item.id === 'nasi-campur');
    }
    if (activeCategory === 'breakfast') {
      return MENU_ITEMS.filter(item => item.category === 'breakfast' && item.id !== 'nasi-campur');
    }
    if (activeCategory === 'drinks') {
      return MENU_ITEMS.filter(item => item.category === 'drinks');
    }
    return MENU_ITEMS;
  }, [activeCategory]);

  const handleCategoryChange = async (catId: string) => {
    await triggerLightImpact();
    setActiveCategory(catId);
  };

  const handleOrderClick = async () => {
    await triggerLightImpact();
    navigate('/order');
  };

  const headerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const headerItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="menu" className="section-padding bg-cream dark:bg-stone-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-800 to-transparent" />
      <div className="content-container">
        
        {/* Section Header */}
        <motion.div 
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="text-center mb-10 md:mb-12"
        >
          <motion.div variants={headerItemVariants} className="flex justify-center mb-3">
            <div className="section-subtitle-artistic">
              ✦ {t('our_menu')} • Warisan Tradisi
            </div>
          </motion.div>
          <motion.h2 variants={headerItemVariants} className="section-title-artistic">
            {t('menu_title')}
          </motion.h2>
          <motion.p variants={headerItemVariants} className="font-body text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-[620px] mx-auto font-light mt-2">
            {t('menu_subtitle')}
          </motion.p>
        </motion.div>

        {/* Category Navigation Bar (Requirement B & D: Sticky & Touch-friendly) */}
        <div className="sticky top-[70px] z-30 mb-10 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 bg-cream/90 dark:bg-stone-950/90 backdrop-blur-md">
          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap min-h-[44px] shrink-0 border select-none ${
                    isActive
                      ? 'text-white border-amber-500 shadow-md shadow-amber-500/20'
                      : 'text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border-stone-200/80 dark:border-stone-800 hover:border-amber-400/50 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMenuCategory"
                      className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-amber-100' : 'text-stone-500 dark:text-stone-400'}`} />
                    <span>{isBm ? cat.labelBm : cat.labelEn}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Grid (Requirement A & C: Balanced Grid & Responsive Layout) */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeCategory}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {filteredMenuItems.map((item) => (
              <TiltCard 
                key={item.id} 
                item={item} 
                isBm={isBm} 
                cardVariants={cardVariants}
                onOrderClick={handleOrderClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Order Now (Guest/Direct Order) Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mt-14 sm:mt-16 text-center max-w-2xl mx-auto px-2"
        >
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[2rem] p-6 sm:p-10 border border-stone-200/80 dark:border-stone-800 shadow-xl relative overflow-hidden group">
            {/* Ambient decorative gradient */}
            <div className="absolute -inset-px bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <h3 className="font-display font-bold text-xl sm:text-3xl text-stone-900 dark:text-white mb-2">
              {isBm ? 'Sedia untuk Memesan?' : 'Ready to Order?'}
            </h3>
            <p className="font-body text-stone-600 dark:text-stone-300 text-xs sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
              {isBm 
                ? 'Sama ada sebagai ahli atau pelawat biasa, langkau pendaftaran dan buat tempahan anda secara terus.' 
                : 'Skip registration entirely and place your catering order directly as a guest.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <HungryButton
                onHungryClick={handleOrderClick}
                text={isBm ? 'Pesan Sekarang (Pelawat)' : 'Order Now (Guest)'}
                className="group-hover:scale-[1.02] min-h-[48px] w-full sm:w-auto"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
