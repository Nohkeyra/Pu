interface SectionLabelProps {
  text: string;
  light?: boolean;
}

export default function SectionLabel({ text }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-sunshine shadow-sunshine-glow" />
        <span className="w-10 h-[1px] bg-gradient-to-r from-sunshine via-kiwi/50 to-transparent" />
      </div>
      <span className="font-accent font-semibold text-[10px] uppercase tracking-[0.24em] text-sunshine">
        {text}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="w-10 h-[1px] bg-gradient-to-l from-sunshine via-kiwi/50 to-transparent" />
        <span className="w-1.5 h-1.5 rounded-full bg-kiwi/70" />
      </div>
    </div>
  );
}
