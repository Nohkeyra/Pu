import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';
import { useCarousel } from '@/hooks/useCarousel';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'motion/react';

const REVIEWS = [
  {
    text: "Wah... we are on our last day of our Putrajaya holiday. The place is at the basement of an administration building with a great view of lake and the mosque. My wife and I bought nasi goreng kampung, nasi lemak, and some other varieties. Everything was good. Really good food, and definitely affordable.",
    name: 'Sufian A',
    rating: 5,
  },
  {
    text: "The food was delicious and the owners are great people. After we ate our lunch here, they give us to try typical Malaysian delicious dessert — fried bananas and durian soup.",
    name: 'Anastasia V',
    rating: 5,
  },
  {
    text: "The Lontong Singapore, Soto and nasi campur are exquisitely delicious! My favorite is the Asam Pedas and ikan keli sambal. Also the teh tarik is legendary, and the coffee here uses Muar's 434 which is well known. Recommended!",
    name: 'Irwan R',
    rating: 5,
  },
  {
    text: "Soto Ayam was delicious. The price is really good for the area where it is located. A hidden gem in Putrajaya with authentic flavors.",
    name: 'Carolina P',
    rating: 5,
  },
  {
    text: "Pelbagai juadah yang tersedia — makanan ala padang yang bermacam-macam lauk dan pauk. Asam pedas, nasi lemak, mee rebus, mee soto, rendang padang, rojak Singapore. Semuanya sedap!",
    name: 'Regular Customer',
    rating: 5,
  },
];

export default function ReviewsSection() {
  const { t } = useLanguage();
  const [slidesToShow, setSlidesToShow] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSlidesToShow(1);
      } else if (window.innerWidth < 1024) {
        setSlidesToShow(2);
      } else {
        setSlidesToShow(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    currentIndex,
    setIsHovered,
    goNext,
    goPrev,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    containerRef,
  } = useCarousel({
    totalSlides: REVIEWS.length,
    slidesToShow,
    autoPlayInterval: 5000,
  });

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

  return (
    <section id="reviews" className="section-padding bg-cream relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="content-container">
        
        <motion.div 
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-16"
        >
          <div className="text-center md:text-left">
            <motion.div variants={headerItemVariants} className="review-header flex justify-center md:justify-start mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-xs font-semibold text-deep-forest/80 uppercase tracking-[0.2em]">
                  {t('reviews')}
                </span>
              </div>
            </motion.div>
            <motion.h2 variants={headerItemVariants} className="review-header font-display font-bold text-[40px] md:text-[56px] text-deep-forest leading-[1.05]">
              {t('what_they_say')}
            </motion.h2>
          </div>
          
          <motion.div variants={headerItemVariants} className="review-header flex items-center justify-center gap-6 mt-8 md:mt-0">
            <div className="flex items-center gap-3 bg-cream-dark/60 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 shadow-lg">
              <Star className="w-5 h-5 text-sunshine fill-sunshine animate-pulse" />
              <div className="flex flex-col">
                <span className="font-bold text-deep-forest leading-none">4.9</span>
                <span className="text-deep-forest/50 text-[10px] uppercase font-bold tracking-widest mt-1">Rating</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-sunshine hover:border-sunshine hover:text-deep-forest text-deep-forest transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(232,144,37,0.2)]"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goNext}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-sunshine hover:border-sunshine hover:text-deep-forest text-deep-forest transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(232,144,37,0.2)]"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Carousel */}
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="overflow-hidden pb-8 pt-4 -mx-3 px-3">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / slidesToShow)}%)`,
              }}
            >
              {REVIEWS.map((review, i) => (
                <div
                  key={i}
                  className="w-full md:w-1/2 lg:w-1/3 flex-shrink-0 px-3"
                >
                  <ReviewCard {...review} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
