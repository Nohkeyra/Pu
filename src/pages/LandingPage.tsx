import { useEffect } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/sections/HeroSection';
import HighlightsSection from '@/sections/HighlightsSection';
import StorySection from '@/sections/StorySection';
import MenuSection from '@/sections/MenuSection';
import ExperienceSection from '@/sections/ExperienceSection';
import ReviewsSection from '@/sections/ReviewsSection';
import VisitSection from '@/sections/VisitSection';

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream dark:bg-background pattern-dots relative">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-tomato-burst to-amber-400 origin-left z-[100]"
        style={{ scaleX }}
      />
      <Header />
      <main className="relative">
        <HeroSection />
        
        {/* Soft visual transition to StorySection */}
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="section-visibility-auto relative">
          <StorySection />
        </div>

        {/* Soft visual transition to HighlightsSection */}
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none" />

        <div className="section-visibility-auto relative">
          <HighlightsSection />
        </div>

        {/* Soft visual transition to MenuSection */}
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />

        <div className="section-visibility-auto relative">
          <MenuSection />
        </div>

        {/* Soft visual transition to ExperienceSection */}
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-tomato-burst/5 to-transparent pointer-events-none" />

        <div className="section-visibility-auto relative">
          <ExperienceSection />
        </div>

        {/* Soft visual transition to ReviewsSection */}
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />

        <div className="section-visibility-auto relative">
          <ReviewsSection />
        </div>

        {/* Soft visual transition to VisitSection */}
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none" />

        <div className="section-visibility-auto relative">
          <VisitSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
