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
        
        <div className="content-container py-4">
          <div className="batik-divider" />
        </div>
        
        <div className="section-visibility-auto relative">
          <StorySection />
        </div>

        <div className="content-container py-4">
          <div className="batik-divider" />
        </div>

        <div className="section-visibility-auto relative">
          <HighlightsSection />
        </div>

        <div className="content-container py-4">
          <div className="batik-divider" />
        </div>

        <div className="section-visibility-auto relative">
          <MenuSection />
        </div>

        <div className="content-container py-4">
          <div className="batik-divider" />
        </div>

        <div className="section-visibility-auto relative">
          <ExperienceSection />
        </div>

        <div className="content-container py-4">
          <div className="batik-divider" />
        </div>

        <div className="section-visibility-auto relative">
          <ReviewsSection />
        </div>

        <div className="content-container py-4">
          <div className="batik-divider" />
        </div>

        <div className="section-visibility-auto relative">
          <VisitSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
