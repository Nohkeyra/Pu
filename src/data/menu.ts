export interface MenuItem {
  id: string;
  nameEn: string;
  nameBm: string;
  descEn: string;
  descBm: string;
  priceEn: string;
  priceBm: string;
  image: string;
  category?: 'breakfast' | 'lunch' | 'hi tea' | 'drinks' | 'mains' | 'beverages';
  suitability?: 'breakfast_hitea' | 'lunch' | string;
  tags?: string[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'asam-pedas',
    nameEn: 'Asam Pedas Ikan Pari',
    nameBm: 'Asam Pedas Ikan Pari',
    descEn: 'Our #1 crowd favorite — spicy tamarind stingray stew with tangy, bold herbal flavors.',
    descBm: 'Kegemaran ramai #1 — rebusan ikan pari asam pedas dengan rasa masam dan berani yang ketara.',
    priceEn: 'From RM 14.00',
    priceBm: 'Daripada RM 14.00',
    image: '/assets/asam-pedas.jpg',
    category: 'mains',
    tags: ['spicy', 'fish', 'signature'],
  },
  {
    id: 'nasi-lemak',
    nameEn: 'Nasi Lemak',
    nameBm: 'Nasi Lemak',
    descEn: "Malaysia's national dish — fragrant coconut rice with spicy sambal, crispy anchovies, peanuts, cucumber & boiled egg.",
    descBm: 'Hidangan kebangsaan Malaysia — nasi santan wangi bersama sambal, ikan bilis, kacang, timun & telur rebus.',
    priceEn: 'From RM 4.50',
    priceBm: 'Daripada RM 4.50',
    image: '/assets/nasi-lemak.jpg',
    category: 'mains',
    tags: ['breakfast', 'classic'],
  },
  {
    id: 'lontong-singapore',
    nameEn: 'Lontong Singapore',
    nameBm: 'Lontong Singapore',
    descEn: 'Compressed rice cakes in rich coconut lodeh vegetable curry with cabbage, long beans, tofu and sambal.',
    descBm: 'Nasi himpit di dalam kuah lodeh sayur bersantan pekat bersama kubis, kacang panjang, dan sambal.',
    priceEn: 'From RM 8.50',
    priceBm: 'Daripada RM 8.50',
    image: '/assets/lontong-singapore.jpg',
    category: 'mains',
    tags: ['vegetarian-friendly'],
  },
  {
    id: 'mee-soto',
    nameEn: 'Mee Soto Ayam',
    nameBm: 'Mee Soto Ayam',
    descEn: 'Aromatic spiced chicken noodle soup with shredded chicken, bean sprouts, and crispy fried shallots.',
    descBm: 'Sup mi ayam aromatik bersama carikan isi ayam, taugeh, dan bawang goreng garing.',
    priceEn: 'From RM 8.00',
    priceBm: 'Daripada RM 8.00',
    image: '/assets/mee-soto.jpg',
    category: 'mains',
  },
  {
    id: 'soto-ayam',
    nameEn: 'Soto Ayam Nasi Impit',
    nameBm: 'Soto Ayam Nasi Impit',
    descEn: 'Rich, spiced chicken broth served with compressed rice cubes (nasi impit) and potato croquette (begedil).',
    descBm: 'Sup ayam berempah pekat dihidang bersama nasi himpit dan bergedil kentang.',
    priceEn: 'From RM 8.50',
    priceBm: 'Daripada RM 8.50',
    image: '/assets/soto-ayam.jpg',
    category: 'mains',
  },
  {
    id: 'nasi-campur',
    nameEn: 'Nasi Campur Catering',
    nameBm: 'Nasi Campur Lauk Catering',
    descEn: 'White rice paired with your selection of daily freshly cooked Malay dishes, from rendang to fresh greens.',
    descBm: 'Nasi putih berlauk dengan pilihan hidangan segar harian, dari rendang hingga sayur tumis.',
    priceEn: 'From RM 10.00',
    priceBm: 'Daripada RM 10.00',
    image: '/assets/nasi-campur.jpg',
    category: 'mains',
    tags: ['daily-special'],
  },
  {
    id: 'teh-tarik',
    nameEn: 'Teh Tarik Kaw',
    nameBm: 'Teh Tarik Kaw',
    descEn: 'Classic Malaysian pulled black tea with sweet condensed milk, frothed to perfection.',
    descBm: 'Teh tarik hitam klasik Malaysia dengan susu pekat manis, berbuih sempurna.',
    priceEn: 'From RM 2.50',
    priceBm: 'Daripada RM 2.50',
    image: '/assets/teh-tarik.jpg',
    category: 'beverages',
  },
  {
    id: 'kopi-kampung',
    nameEn: 'Kopi 434 Kopi Kampung',
    nameBm: 'Kopi 434 Kopi Kampung',
    descEn: 'Classic rich, dark roasted Malaysian village black coffee, served sweet and aromatic.',
    descBm: 'Kopi kampung hitam panggang klasik Malaysia yang pekat dan harum, dihidangkan manis aromatik.',
    priceEn: 'From RM 2.80',
    priceBm: 'Daripada RM 2.80',
    image: '/assets/kopi_kampung.jpg',
    category: 'beverages',
  },
];
