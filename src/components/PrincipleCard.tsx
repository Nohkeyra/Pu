import type { LucideIcon } from 'lucide-react';

interface PrincipleCardProps {
  icon: LucideIcon;
  name: string;
  malayName: string;
  description: string;
}

export default function PrincipleCard({ icon: Icon, name, malayName, description }: PrincipleCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_12px_40px_-8px_rgba(25,83,43,0.15)] flex flex-col items-center h-full border border-deep-forest/5 hover:border-kiwi/40">
      {/* Icon container */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-kiwi/20 rounded-full blur-xl group-hover:bg-kiwi/40 group-hover:scale-150 transition-all duration-700" />
        <div className="relative w-16 h-16 rounded-2xl bg-kiwi/10 border border-kiwi/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:border-kiwi/60 transition-all duration-500">
          <Icon className="w-7 h-7 text-kiwi group-hover:text-crisp-carrot transition-colors duration-300" strokeWidth={1.5} />
        </div>
      </div>

      {/* Malay badge */}
      <span className="inline-block px-4 py-1.5 bg-kiwi/10 border border-kiwi/20 rounded-full font-accent font-semibold text-[10px] text-kiwi uppercase tracking-[0.15em] mb-3 group-hover:bg-kiwi/20 transition-colors">
        {malayName}
      </span>

      <h3 className="font-display font-semibold text-lg text-deep-forest mb-3 group-hover:text-kiwi transition-colors duration-300">
        {name}
      </h3>

      <p className="font-body text-[13px] text-stone leading-relaxed flex-grow group-hover:text-deep-forest/70 transition-colors">
        {description}
      </p>

      {/* Bottom accent */}
      <div className="mt-6 w-12 h-[2px] bg-gradient-to-r from-transparent via-kiwi/50 to-transparent group-hover:w-24 group-hover:via-sunshine/80 transition-all duration-500" />
    </div>
  );
}
