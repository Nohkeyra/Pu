import { Star, Quote, MapPin } from 'lucide-react';

interface ReviewCardProps {
  text: string;
  name: string;
  rating: number;
  date?: string;
  tag?: string;
  source?: string;
}

export default function ReviewCard({ text, name, rating, date, tag, source = 'Google Review' }: ReviewCardProps) {
  return (
    <div className="group relative bg-cream-dark/60 dark:bg-card/60 backdrop-blur-md rounded-2xl p-7 min-h-[340px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(232,144,37,0.12)] border border-stone/15 dark:border-white/10 hover:border-[var(--color-sunshine-cta)]/40 hover:bg-[var(--color-sunshine-cta)]/5">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-deep-forest/[0.04] dark:bg-white/5 border border-deep-forest/10 dark:border-white/10 text-[11px] font-semibold text-deep-forest/70 dark:text-white/70">
            <MapPin className="w-3 h-3 text-[var(--color-sunshine-cta)]" />
            <span>{source}</span>
          </div>
          <div className="opacity-30 group-hover:opacity-100 transition-opacity">
            <Quote className="w-6 h-6 text-[var(--color-sunshine-cta)]" strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 transition-all duration-300 ${
                i < rating 
                  ? 'text-[var(--color-sunshine-cta)] fill-sunshine' 
                  : 'text-stone-300 dark:text-white/10'
              }`}
            />
          ))}
          {date && (
            <span className="ml-2 text-[11px] text-deep-forest/40 dark:text-stone-400 font-medium">
              {date}
            </span>
          )}
        </div>
        
        <p className="font-body text-[14.5px] sm:text-[15px] text-deep-forest/85 dark:text-stone-200 leading-relaxed font-light italic">
          "{text}"
        </p>

        {tag && (
          <div className="mt-3">
            <span className="inline-block px-2.5 py-0.5 text-[11px] font-medium rounded-md bg-[var(--color-sunshine-cta)]/10 text-deep-forest dark:text-white border border-[var(--color-sunshine-cta)]/20">
              {tag}
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-stone/10 dark:border-white/10 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-full bg-deep-forest/[0.06] dark:bg-white/10 border border-deep-forest/10 dark:border-white/10 flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-base text-[var(--color-sunshine-cta)]">
            {name.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-[15px] text-deep-forest dark:text-white truncate">
            {name}
          </p>
          <span className="font-sans font-medium text-[11px] text-deep-forest/50 dark:text-stone-400 uppercase tracking-wider block">
            Verified Google Local Guide
          </span>
        </div>
      </div>
    </div>
  );
}
