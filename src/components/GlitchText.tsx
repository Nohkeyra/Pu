interface GlitchTextProps {
  text: string;
  className?: string;
}

export default function GlitchText({ text, className = "" }: GlitchTextProps) {
  return (
    <span className={`relative inline-block ${className} group cursor-default select-none`}>
      {/* Main Text */}
      <span className="relative z-10 block text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]">
        {text}
      </span>
    </span>
  );
}
