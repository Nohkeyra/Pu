import { useEffect, useState } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export default function GlitchText({ text, className = "" }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    // Highly sophisticated periodic glitching: glitches briefly for 600ms, then rests.
    const interval = setInterval(() => {
      setIsGlitching(true);
      const timer = setTimeout(() => {
        setIsGlitching(false);
      }, 600);
      return () => clearTimeout(timer);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`relative inline-block ${className} group cursor-default select-none`}>
      {/* Kiwi Lime Glitch Layer */}
      <span 
        className={`absolute top-0 left-0 w-full h-full text-kiwi/80 mix-blend-screen pointer-events-none select-none ${
          isGlitching ? 'animate-glitch-cyan opacity-80' : 'opacity-0 group-hover:animate-glitch-cyan group-hover:opacity-80 transition-opacity duration-300'
        }`}
        aria-hidden="true"
      >
        {text}
      </span>

      {/* Main Text */}
      <span className="relative z-10 block text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]">
        {text}
      </span>

      {/* Sunshine Orange Glitch Layer */}
      <span 
        className={`absolute top-0 left-0 w-full h-full text-sunshine/80 mix-blend-screen pointer-events-none select-none ${
          isGlitching ? 'animate-glitch-magenta opacity-80' : 'opacity-0 group-hover:animate-glitch-magenta group-hover:opacity-80 transition-opacity duration-300'
        }`}
        aria-hidden="true"
      >
        {text}
      </span>
    </span>
  );
}
