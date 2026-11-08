import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/sections/HeroSection';
import HighlightsSection from '@/sections/HighlightsSection';
import StorySection from '@/sections/StorySection';
import MenuSection from '@/sections/MenuSection';
import ExperienceSection from '@/sections/ExperienceSection';
import ReviewsSection from '@/sections/ReviewsSection';
import VisitSection from '@/sections/VisitSection';
import './landing-page.css';
import './heritage-hero.css';

export default function LandingPage() {
  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
      ? 'auto'
      : 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = previous;
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className={"landing-page living-canvas-v31"}>
        {/* Default variant restores the transparent header over the full-bleed hero,
            then uses the existing scroll-aware header styling further down. */}
        <Header variant="default" />
        <main id="landing-content">
          <HeroSection />
          <HighlightsSection />
          <MenuSection />
          <div className="landing-heritage-rule batik-container" aria-hidden="true" />
          <StorySection />
          <ExperienceSection />
          <ReviewsSection />
          <VisitSection />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
