import { DEFAULT_MENU_ITEMS } from '../constants/menu.js';

export const SET_BOX_MENU_TITLE = 'Set Box Makanan & Minuman';

export interface ReferenceDish {
  nameEn: string;
  nameBm: string;
  price: number;
}

let cachedReferenceDishes: ReferenceDish[] | null = null;

export function getReferenceDishes(): ReferenceDish[] {
  if (cachedReferenceDishes && cachedReferenceDishes.length > 0) {
    return cachedReferenceDishes;
  }

  const list: ReferenceDish[] = [];
  if (Array.isArray(DEFAULT_MENU_ITEMS)) {
    for (const item of DEFAULT_MENU_ITEMS) {
      if (item && typeof item.price === 'number') {
        list.push({
          nameEn: item.nameEn || '',
          nameBm: item.nameBm || '',
          price: Number(item.price),
        });
      }
    }
  }

  cachedReferenceDishes = list;
  return list;
}

export function splitCustomMenu(menuStr: string): string[] {
  if (!menuStr || typeof menuStr !== 'string') return [];
  const normalized = menuStr
    .replace(/\s+dan\s+/gi, ',')
    .replace(/\s+and\s+/gi, ',')
    .replace(/\s+dengan\s+/gi, ',')
    .replace(/\s+with\s+/gi, ',')
    .replace(/\s+&\s+/gi, ',')
    .replace(/\s*\+\s*/g, ',')
    .replace(/\n+/g, ',');

  return normalized
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== SET_BOX_MENU_TITLE);
}

export function findBestMatch(fragment: string, refDishes?: ReferenceDish[]): ReferenceDish | null {
  const cleanFragment = fragment.toLowerCase().trim();
  if (!cleanFragment) return null;

  const dishes = refDishes || getReferenceDishes();
  let bestMatch: ReferenceDish | null = null;
  let bestScore = 0;

  const fragmentWords = cleanFragment
    .split(/\s+/)
    .map(w => w.replace(/[^\w\s]/g, ''))
    .filter(w => w.length > 1);

  for (const dish of dishes) {
    const nameEnClean = dish.nameEn.toLowerCase();
    const nameBmClean = dish.nameBm.toLowerCase();

    let score = 0;

    if (nameEnClean === cleanFragment || nameBmClean === cleanFragment) {
      score += 100;
    }

    if (cleanFragment.includes(nameEnClean) || cleanFragment.includes(nameBmClean)) {
      score += 50;
    }
    if (nameEnClean.includes(cleanFragment) || nameBmClean.includes(cleanFragment)) {
      score += 40;
    }

    const dishEnWords = nameEnClean.split(/\s+/).map(w => w.replace(/[^\w\s]/g, '')).filter(w => w.length > 1);
    const dishBmWords = nameBmClean.split(/\s+/).map(w => w.replace(/[^\w\s]/g, '')).filter(w => w.length > 1);

    let enWordMatches = 0;
    for (const fw of fragmentWords) {
      if (dishEnWords.includes(fw)) enWordMatches++;
    }

    let bmWordMatches = 0;
    for (const fw of fragmentWords) {
      if (dishBmWords.includes(fw)) bmWordMatches++;
    }

    const wordMatchScore = Math.max(enWordMatches, bmWordMatches) * 10;
    score += wordMatchScore;

    if (score > bestScore && score >= 15) {
      bestScore = score;
      bestMatch = dish;
    }
  }

  return bestMatch;
}

export interface OrderPricingInput {
  dishes?: any[];
  veggies?: any[];
  customMenu?: string;
  quantity?: number | string;
  guests?: number | string;
  meals?: string[];
  menu?: string;
}

export interface OrderPricingResult {
  pricePerPax: number;
  prices: Record<string, number>;
  totalAmount: number;
}

export function getPricePerPax(
  dishes?: any[],
  veggies?: any[],
  customMenu?: string
): number {
  const refDishes = getReferenceDishes();
  let price = 0;

  if (Array.isArray(dishes)) {
    for (const dish of dishes) {
      if (typeof dish === 'number') {
        price += dish;
      } else if (dish && typeof dish === 'object') {
        if (typeof dish.price === 'number') {
          price += dish.price;
        } else {
          const match = refDishes.find(
            r =>
              r.nameEn.toLowerCase() === (dish.nameEn || '').toLowerCase() ||
              r.nameBm.toLowerCase() === (dish.nameBm || '').toLowerCase()
          );
          if (match) price += match.price;
        }
      } else if (typeof dish === 'string' && dish.trim()) {
        const match = findBestMatch(dish, refDishes);
        if (match) price += match.price;
      }
    }
  }

  if (Array.isArray(veggies)) {
    for (const veg of veggies) {
      if (typeof veg === 'number') {
        price += veg;
      } else if (veg && typeof veg === 'object') {
        if (typeof veg.price === 'number') {
          price += veg.price;
        } else {
          const match = refDishes.find(
            r =>
              r.nameEn.toLowerCase() === (veg.nameEn || '').toLowerCase() ||
              r.nameBm.toLowerCase() === (veg.nameBm || '').toLowerCase()
          );
          if (match) price += match.price;
        }
      } else if (typeof veg === 'string' && veg.trim()) {
        const match = findBestMatch(veg, refDishes);
        if (match) price += match.price;
      }
    }
  }

  if (customMenu && typeof customMenu === 'string' && customMenu.trim() && customMenu.trim() !== SET_BOX_MENU_TITLE) {
    const fragments = splitCustomMenu(customMenu);
    for (const fragment of fragments) {
      const match = findBestMatch(fragment, refDishes);
      if (match) {
        price += match.price;
      }
    }
  }

  return Number(price.toFixed(2));
}

export function calculateOrderPricing(input: OrderPricingInput): OrderPricingResult {
  const dishes = input.dishes;
  const veggies = input.veggies;
  const customMenu = input.customMenu;
  const qty = Number(input.quantity ?? input.guests) || 0;
  const meals = Array.isArray(input.meals) && input.meals.length > 0 ? input.meals : ['default'];

  const pricePerPax = getPricePerPax(dishes, veggies, customMenu);

  const prices: Record<string, number> = {};
  for (const meal of meals) {
    prices[meal] = pricePerPax;
  }

  const mealCount = Array.isArray(input.meals) && input.meals.length > 0 ? input.meals.length : 1;
  const totalAmount = Number((pricePerPax * qty * mealCount).toFixed(2));

  return {
    pricePerPax,
    prices,
    totalAmount,
  };
}
