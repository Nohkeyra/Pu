interface GlitchTextProps {
  text: string;
  className?: string;
}

export default function GlitchText({ text, className = "" }: GlitchTextProps) {
  return (
    <span className={`relative inline-block ${className} group cursor-default select-none`}>
      {/* Background Batik-Gold Ambient Glow */}
      <span 
        aria-hidden="true"
        className="absolute inset-0 z-0 block bg-gradient-to-r from-amber-400/30 via-yellow-300/40 to-amber-500/30 blur-xl opacity-80 pointer-events-none transform scale-105"
      />
      
      {/* Metallic Gold Shimmer Batik Text */}
      <span className="relative z-10 block font-display bg-gradient-to-r from-sunshine via-crisp-carrot to-sunshine bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_6s_linear_infinite] drop-shadow-[0_4px_16px_rgba(246,153,19,0.45)] tracking-tight">
        {text}
      </span>
    </span>
  );
}

