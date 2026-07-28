import { getAssetUrl } from "@/lib/utils";

interface FoodCardProps {
  name: string;
  description: string;
  price: string;
  image: string;
  isBestseller?: boolean;
  isSpicy?: boolean;
}

export default function FoodCard({ name, description, price, image, isBestseller, isSpicy }: FoodCardProps) {
  return (
    <div className="group relative bg-white dark:bg-card rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-premium border border-deep-forest/[0.03] dark:border-white/5 hover:border-sunshine/30 h-full flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={getAssetUrl(image)}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {isBestseller && (
            <span className="bg-sunshine text-white px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg backdrop-blur-md">
              BESTSELLER
            </span>
          )}
          {isSpicy && (
            <span className="bg-tomato-burst text-white px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg backdrop-blur-md">
              🔥 SPICY
            </span>
          )}
        </div>
        {/* Price Tag */}
        <div className="absolute top-4 right-4 bg-white/95 dark:bg-card/95 backdrop-blur-md text-deep-forest  px-5 py-2.5 rounded-2xl font-black text-sm shadow-xl border border-white/20">
          <span className="text-sunshine mr-0.5">RM</span>{price.replace('RM', '').trim()}
        </div>
      </div>

      <div className="p-7 flex flex-col flex-1">
        <h3 className="font-display font-black text-2xl text-sunshine mb-2 group-hover:scale-[1.02] transition-transform duration-300">
          {name}
        </h3>
        <p className="font-body text-sm text-stone dark:text-stone/70 leading-relaxed flex-1 line-clamp-2">
          {description}
        </p>
        
        <div className="mt-6 pt-5 border-t border-deep-forest/5 dark:border-white/5 flex items-center justify-between">
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-black text-stone/50 dark:text-stone/30">
            EST. 1986
          </span>
          <button className="w-11 h-11 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-transparent flex items-center justify-center group-hover:bg-sunshine group-hover:text-white group-hover:shadow-sunshine-glow transition-all duration-300">
            <svg className="w-6 h-6 text-deep-forest  group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
