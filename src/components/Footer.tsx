import { useRef } from 'react';
import { Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { getAssetUrl } from '../lib/utils';
import { TransparentLogo } from './TransparentLogo';
import { Batik3DMotion } from './Batik3DMotion';

function BrandMark() {
  return (
    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
      <TransparentLogo
        src={getAssetUrl('/assets/wawasan_logo.svg')}
        alt="Restoran Wawasan Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default function Footer() {
  const { t } = useLanguage();
  const footerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ['start end', 'end start'],
  });

  // Parallax, scale, and scroll opacity effects mirroring HeroSection:
  // Fades in as footer comes into view, reaches full opacity, then fades out to 0 when scrolling away
  const rawY = useTransform(scrollYProgress, [0, 1], [80, -40]);
  const rawScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.35, 0.75, 1], [0, 1, 1, 0]);

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothY = useSpring(rawY, springConfig);
  const smoothScale = useSpring(rawScale, springConfig);

  const NAV_LINKS = [
    { label: t('our_story'), href: '#story' },
    { label: t('menu'), href: '#menu' },
    { label: t('experience'), href: '#experience' },
    { label: t('reviews'), href: '#reviews' },
    { label: t('visit_us'), href: '#visit' },
  ];

  return (
    <footer ref={footerRef} className="bg-[#0a1c18] dark:bg-[#0c100e] text-white/90 pt-16 pb-[calc(100px+env(safe-area-inset-bottom,16px))] relative overflow-hidden transition-colors duration-500 border-t border-amber-500/20">
      {/* Cinematic Deep Dark Background Layer (Matching HeroSection) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a1c18] dark:bg-[#0c100e] pointer-events-none">
        {/* Dynamic Atmospheric Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1c18]/80 via-[#0a1c18]/40 to-[#0a1c18] dark:from-[#0c100e]/60 dark:via-[#0c100e]/30 dark:to-[#0c100e]/80 z-0" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0c453c]/30 via-transparent to-amber-950/20 dark:from-[#151d1a]/40 dark:to-transparent z-0" />

        {/* Scroll-animated 3D Batik Background Layer */}
        <motion.div 
          style={{ y: smoothY, scale: smoothScale, opacity }} 
          className="batik-fade-transition batik-container absolute inset-0 z-0"
        >
          <Batik3DMotion
            mode="background"
            src={getAssetUrl('/assets/batik_vector_pattern.jpg')}
            backgroundSize="cover"
            backgroundRepeat="no-repeat"
            maxRotation={15}
            imgClassName="opacity-35 dark:opacity-55 dark:contrast-125 dark:brightness-125 transition-opacity duration-700 pointer-events-none"
          />
        </motion.div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pattern-dots opacity-10 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_90%)] pointer-events-none z-10" />
      </div>

      {/* Decorative Ambient Orb (Matching HeroSection) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] max-w-[400px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none z-0" 
      />

      <div className="content-container relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start mb-16">

          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3 group min-h-[44px]">
              <BrandMark />
              <div>
                <span className="font-display font-semibold text-2xl text-white tracking-tight group-hover:text-[var(--color-sunshine-cta)] transition-colors">
                  Restoran Wawasan
                </span>
                <span className="microcopy-12-upper block text-[var(--color-sunshine-cta)] mt-1">
                  Pak Usop
                </span>
              </div>
            </Link>
            <p className="font-body text-white/75 text-sm max-w-sm leading-relaxed font-light">
              A culinary legacy from Singapore since 1986, now serving authentic Nusantara comfort food in the heart of Putrajaya.
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href="https://www.facebook.com/WawasanRestoran"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-white/75 hover:bg-[var(--color-sunshine-cta)] hover:text-white transition-all duration-300 border border-white/10 hover:border-[var(--color-sunshine-cta)]"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-display font-semibold text-lg text-white">Explore</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-white/70 hover:text-[var(--color-sunshine-cta)] transition-colors text-sm font-light"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-light text-white/55">
          <p>© {new Date().getFullYear()} Restoran Wawasan Pak Usop. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/order" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">
              Order Online
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
