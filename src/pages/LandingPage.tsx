import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/sections/HeroSection';
import HighlightsSection from '@/sections/HighlightsSection';
import StorySection from '@/sections/StorySection';
import MenuSection from '@/sections/MenuSection';
import ExperienceSection from '@/sections/ExperienceSection';
import ReviewsSection from '@/sections/ReviewsSection';
import VisitSection from '@/sections/VisitSection';
import './landing-page.css';

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
      <div className="landing-page">
        <Header variant="landing" />
        <main id="landing-content">
          <HeroSection />
          <HighlightsSection />
          <MenuSection />
          <div className="landing-heritage-rule" aria-hidden="true" />
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
