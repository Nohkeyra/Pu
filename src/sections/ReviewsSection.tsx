import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';
import { useCarousel } from '@/hooks/useCarousel';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'motion/react';

const REVIEWS = [
  {
    text: "The food is delicious..the fried bananas and banana pancakes are also delicious..the pancakes have less flour & the bananas taste sweet..the food is just like our parents cooked..the prices are reasonable..just parking is a little difficult..just parking on the side of the road..you're out of luck if you get a ticket..hehe..",
    name: 'Miss Sya',
    rating: 5,
    date: '4 weeks ago',
    tag: 'Dine-in • Lunch',
    source: 'Google Maps'
  },
  {
    text: "Had a wonderful lunch at Restoran Wawasan Pak Usop! The chicken and catfish were absolutely delicious, and they even treated me to a fresh jackfruit dessert. What impressed me the most was their kindness. When I had a problem with my payment, they simply told me, \"It's okay, just enjoy your meal.\"",
    name: 'hugh ahn',
    rating: 5,
    date: '2 months ago',
    tag: 'Dine-in • Lunch',
    source: 'Google Maps'
  },
  {
    text: "We came here for breakfast on a friday to try out the mee rebus, but did know that mee rebus is only served on Thursdays. So we had the Soto and nasi lemak, instead... Anyway, it has a great view of Putrajaya Lake.",
    name: 'Rahmah Ramli',
    rating: 4,
    date: '4 months ago',
    tag: 'Dine-in • Breakfast',
    source: 'Google Maps'
  },
  {
    text: "I happend to see this restaurant on google map and decided to try, The Food was SO GOOD and even the drink. The price is really cheap def recommended 👌👌",
    name: 'Buachompoo Rerksuitthirat',
    rating: 5,
    date: '5 months ago',
    tag: 'Dine-in • Lunch',
    source: 'Google Maps'
  },
  {
    text: "I ordered Soto Ayam, topped with delicious deep-fried potato dumplings, for RM8.50. It was filled with lots of toppings, including potatoes and kamaboko fish cakes. It's closed on the weekend, so I was glad I went during the only time I could.",
    name: '大渕真志',
    rating: 5,
    date: '8 months ago',
    tag: 'Dine-in • Soto Ayam',
    source: 'Google Maps'
  },
  {
    text: "Soto Ayam was delicious. The price is really good for the area where is located.",
    name: 'Carol Pitta',
    rating: 5,
    date: 'a year ago',
    tag: 'Dine-in • Soto Ayam',
    source: 'Google Maps'
  },
  {
    text: "Best to eat here, the food is delicious. Pak Usop is friendly and accommodating. Cheap price is worth it. Can repeat",
    name: 'Sarina Yusuf',
    rating: 5,
    date: 'a year ago',
    tag: 'Dine-in • Breakfast',
    source: 'Google Maps'
  },
];

const ReviewsSection = React.memo(() => {
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
    <section id="reviews" className="section-padding bg-cream dark:bg-background relative">
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
              <div className="section-subtitle-artistic">
                {t('reviews')}
              </div>
            </motion.div>
            <motion.h2 variants={headerItemVariants} className="review-header section-title-artistic text-center md:text-left">
              {t('what_they_say')}
            </motion.h2>
          </div>
          
          <motion.div variants={headerItemVariants} className="review-header flex items-center justify-center gap-6 mt-8 md:mt-0">
            <div className="flex items-center gap-3 bg-cream-dark/60 dark:bg-card/80 backdrop-blur-md border border-deep-forest/10 dark:border-white/10 rounded-2xl px-5 py-3 shadow-lg">
              <Star className="w-5 h-5 text-[var(--color-sunshine-cta)] fill-sunshine animate-pulse" />
              <div className="flex flex-col">
                <span className="font-bold text-deep-forest dark:text-white leading-none">4.9</span>
                <span className="text-deep-forest/50 dark:text-stone-400 microcopy-12-upper uppercase font-bold tracking-widest mt-1">Rating</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                className="w-12 h-12 rounded-full bg-deep-forest/[0.04] dark:bg-white/5 border border-deep-forest/10 dark:border-white/10 flex items-center justify-center hover:bg-[var(--color-sunshine-cta)] hover:border-[var(--color-sunshine-cta)] hover:text-deep-forest text-deep-forest transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(246,153,19,0.30)]"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goNext}
                className="w-12 h-12 rounded-full bg-deep-forest/[0.04] dark:bg-white/5 border border-deep-forest/10 dark:border-white/10 flex items-center justify-center hover:bg-[var(--color-sunshine-cta)] hover:border-[var(--color-sunshine-cta)] hover:text-deep-forest text-deep-forest transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(246,153,19,0.30)]"
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
});

export default ReviewsSection;
