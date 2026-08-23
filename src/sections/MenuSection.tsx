import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { MENU_ITEMS } from '@/data/menu';
import ResponsiveImage from '@/components/ResponsiveImage';
import { HungryButton } from '@/components/ui/HungryButton';

// 3D Parallax Tilt Card for Menu Items
function TiltCard({ item, isBm, idx, cardVariants }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["14deg", "-14deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-14deg", "14deg"]);

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

  return (
    <div style={{ perspective: 1200 }} className="relative">
      <motion.div 
        variants={cardVariants}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="menu-card group relative bg-white dark:bg-card/95 rounded-[2rem] overflow-hidden border border-amber-500/15 dark:border-white/10 hover:border-amber-500/40 shadow-lg hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 z-10 flex flex-col h-full"
      >
        {/* Subtle background batik watermark */}
        <div className="absolute inset-0 batik-watermark opacity-25 dark:opacity-[0.05] pointer-events-none" />

        <div className="aspect-[4/3] overflow-hidden relative rounded-t-[2rem]" style={{ transform: 'translateZ(40px)' }}>
          <ResponsiveImage
            src={item.image || ''}
            alt={isBm ? item.nameBm : item.nameEn}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            containerClassName="w-full h-full"
            className="group-hover:scale-105 transition-transform duration-700 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-50 group-hover:opacity-35 transition-opacity duration-500" />
          
          {/* Magazine-Style Floating Glassmorphism Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-black/50 backdrop-blur-md text-amber-300 border border-amber-400/30 shadow-lg">
              {idx % 2 === 0 ? (isBm ? 'Paling Laris' : 'Best Seller') : (isBm ? 'Sajian Warisan' : 'Heritage Dish')}
            </span>
          </div>
        </div>

        <div className="p-6 relative flex flex-col justify-between flex-1" style={{ transform: 'translateZ(60px)' }}>
          <div>
            <h3 className="font-display font-black text-xl text-deep-forest dark:text-amber-100 group-hover:text-[var(--color-sunshine-cta)] transition-colors duration-300 mb-2">
              {isBm ? item.nameBm : item.nameEn}
            </h3>
            <p className="font-body text-stone dark:text-stone/70 leading-relaxed font-normal text-xs mb-6 line-clamp-2">
              {isBm ? item.descBm : item.descEn}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-sunshine-cta)] via-[var(--color-sunshine-cta-hover)] to-[var(--color-sunshine-cta)] border border-amber-400/35 p-3.5 flex items-center justify-between shadow-md shadow-[var(--color-sunshine-cta)]/20 group-hover:border-amber-400/70 transition-all duration-300 mt-auto" style={{ transform: 'translateZ(80px)' }}>
            {/* Authentic Non-Repeating Malaysian Batik Overlay */}
            <div 
              className="absolute inset-0 opacity-40 dark:opacity-60 pointer-events-none transition-opacity duration-300 group-hover:opacity-80 mix-blend-overlay dark:mix-blend-screen"
              style={{
                backgroundImage: `url(${getAssetUrl('/assets/batik_pattern_hd.jpg')})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative z-10 flex items-center justify-between w-full">
              <span className="text-[10px] font-black text-amber-200 uppercase tracking-[0.2em] drop-shadow-sm">
                {isBm ? 'Harga Bermula' : 'Price Starts'}
              </span>
              <span className="font-sans font-black text-white text-base md:text-lg drop-shadow-sm group-hover:scale-105 transition-transform duration-300">
                {isBm ? item.priceBm : item.priceEn}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function MenuSection() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isBm = language === 'bm';
  const [menuItems, setMenuItems] = useState(MENU_ITEMS);

  useEffect(() => {
    // Keep featured menu items reliably populated with valid curated images
    setMenuItems(MENU_ITEMS);
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
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="menu" className="section-padding bg-cream relative overflow-hidden">
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
            <div className="section-subtitle-artistic">
              ✦ {t('our_menu')} • Warisan Rasa
            </div>
          </motion.div>
          <motion.h2 variants={headerItemVariants} className="section-title-artistic">
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
          {menuItems.map((item, idx) => (
            <TiltCard 
              key={item.nameEn} 
              item={item} 
              isBm={isBm} 
              idx={idx} 
              cardVariants={cardVariants} 
            />
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
              <HungryButton
                onHungryClick={() => navigate('/order')}
                text={isBm ? 'Pesan Sekarang (Pelawat)' : 'Order Now (Guest)'}
                className="group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
