import { getAssetUrl } from "@/lib/utils";
import ResponsiveImage from "@/components/ResponsiveImage";

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
    <div className="group relative bg-white dark:bg-card rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-sm border border-stone/15 dark:border-white/10 hover:border-sunshine/30 h-full flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ResponsiveImage
          src={getAssetUrl(image)}
          alt={name}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          containerClassName="w-full h-full"
          className="group-hover:scale-110 transition-transform duration-700"
        />
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {isBestseller && (
            <span className="bg-sunshine text-deep-forest px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg backdrop-blur-md">
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
        <div className="absolute top-4 right-4 bg-white/95 dark:bg-card/95 backdrop-blur-md text-deep-forest px-5 py-2.5 rounded-2xl font-black text-sm shadow-xl border border-white/20">
          <span className="text-sunshine mr-0.5">RM</span>{price.replace('RM', '').trim()}
        </div>
      </div>

      <div className="p-7 flex flex-col flex-1">
        <h3 className="font-display font-black text-2xl text-sunshine mb-2 group-hover:scale-[1.02] transition-transform duration-300">
          {name}
        </h3>
        <p className="font-body text-sm text-stone dark:text-stone/70 leading-relaxed mb-4 flex-1">
          {description}
        </p>
        <div className="mt-auto pt-4 border-t border-stone/15 dark:border-white/10">
          <span className="font-display font-bold text-deep-forest dark:text-white/90">
            {price}
          </span>
        </div>
      </div>
    </div>
  );
}
