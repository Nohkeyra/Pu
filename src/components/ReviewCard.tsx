import { Star, Quote } from 'lucide-react';

interface ReviewCardProps {
  text: string;
  name: string;
  rating: number;
}

export default function ReviewCard({ text, name, rating }: ReviewCardProps) {
  return (
    <div className="group relative bg-cream-dark/60 backdrop-blur-md rounded-3xl p-8 min-h-[320px] flex flex-col transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(232,144,37,0.08)] border border-white/[0.06] hover:border-sunshine/30 hover:bg-deep-forest-dark/90">
      <div className="mb-6 opacity-30 group-hover:opacity-100 transition-opacity">
        <Quote className="w-10 h-10 text-sunshine" strokeWidth={1.5} />
      </div>
      
      <div className="flex gap-1 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 transition-all duration-300 ${
              i < rating 
                ? 'text-sunshine fill-sunshine' 
                : 'text-white/10'
            }`}
          />
        ))}
      </div>
      
      <p className="font-body text-[16px] text-deep-forest/80 leading-relaxed flex-1 font-light italic">
        "{text}"
      </p>
      
      <div className="mt-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="font-display font-semibold text-lg text-sunshine">
            {name.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-display font-semibold text-[16px] text-deep-forest">
            {name}
          </p>
          <span className="font-sans font-medium text-[12px] text-deep-forest/50 uppercase tracking-widest">
            Verified Guest
          </span>
        </div>
      </div>
    </div>
  );
}
