export interface MenuItem {
  id: string;
  nameEn: string;
  nameBm: string;
  descEn: string;
  descBm: string;
  price: number;
  category: string;
  suitability?: string;
  available?: boolean;
  image?: string;
}

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // Breakfast
  { id: 'nasi_lemak_biasa', nameEn: 'Nasi Lemak Biasa', nameBm: 'Nasi Lemak Biasa', descEn: 'Aromatic coconut rice with spicy sambal, egg, and peanuts', descBm: 'Nasi lemak harum dengan sambal tumis bilis, telur, timun dan kacang', price: 4.5, category: 'breakfast', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'nasi_lemak_ayam', nameEn: 'Nasi Lemak Ayam Goreng', nameBm: 'Nasi Lemak Ayam Goreng', descEn: 'Coconut rice served with spiced golden fried chicken', descBm: 'Nasi lemak dengan ayam goreng berempah panas', price: 9.5, category: 'breakfast', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'mee_goreng', nameEn: 'Mee Goreng Mamak', nameBm: 'Mee Goreng Mamak', descEn: 'Wok-fried yellow noodles with traditional spices', descBm: 'Mee goreng mamak dengan cucur, taukua dan telur', price: 6, category: 'breakfast', image: '/assets/mee-soto.jpg' },
  { id: 'roti_canai', nameEn: 'Roti Canai', nameBm: 'Roti Canai', descEn: 'Flaky flatbread served with savory dhal curry', descBm: 'Roti canai lembut dan garing bersama kuah dhal', price: 2.5, category: 'breakfast', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'kuih_muih', nameEn: 'Assorted Malay Kuih', nameBm: 'Kuih-Muih Campur', descEn: 'Sweet and savory traditional hand-crafted delicacies', descBm: 'Aneka pilihan kuih-muih tradisional melayu', price: 3.5, category: 'breakfast', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  
  // Lunch
  { id: 'asam_pedas', nameEn: 'Asam Pedas Ikan Pari', nameBm: 'Asam Pedas Ikan Pari', descEn: 'Fresh stingray cooked in spicy, tangy herbal tamarind gravy', descBm: 'Ikan pari segar dimasak asam pedas berempah', price: 14, category: 'lunch', image: '/assets/images/asam_pedas_drawn_1786678089136.jpg' },
  { id: 'ayam_goreng', nameEn: 'Spiced Fried Chicken', nameBm: 'Ayam Goreng Berempah', descEn: 'Crispy fried chicken with aromatic traditional spices', descBm: 'Ayam goreng crispy dengan rempah istimewa', price: 9.5, category: 'lunch', image: '/assets/images/ayam_berempah_drawn_1786678122149.jpg' },
  { id: 'daging_masak_merah', nameEn: 'Beef Masak Merah', nameBm: 'Daging Masak Merah', descEn: 'Tender beef cooked in rich sweet and savory tomato sauce', descBm: 'Daging lembu dimasak merah dengan tomato', price: 14, category: 'lunch', image: '/assets/images/rendang_daging_drawn_1786678134956.jpg' },
  { id: 'sambal_sotong', nameEn: 'Sambal Squid', nameBm: 'Sambal Sotong', descEn: 'Squid cooked in rich chili sambal paste', descBm: 'Sotong dimasak sambal petai', price: 14, category: 'lunch', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'ikan_keli', nameEn: 'Sambal Catfish', nameBm: 'Ikan Keli Sambal', descEn: 'Crispy fried catfish tossed in fiery house sambal', descBm: 'Ikan keli goreng dengan sambal', price: 10.5, category: 'lunch', image: '/assets/nasi-campur.jpg' },
  { id: 'rendang_daging', nameEn: 'Beef Rendang', nameBm: 'Rendang Daging', descEn: 'Slow-cooked traditional caramelized beef curry', descBm: 'Rendang daging lembu tradisional', price: 15, category: 'lunch', image: '/assets/images/rendang_daging_drawn_1786678134956.jpg' },
  { id: 'kari_kambing', nameEn: 'Mutton Curry', nameBm: 'Kari Kambing', descEn: 'Rich, thick spiced mutton curry', descBm: 'Kari kambing berempah pekat', price: 17, category: 'lunch', image: '/assets/images/rendang_daging_drawn_1786678134956.jpg' },
  { id: 'udang_goreng', nameEn: 'Crispy Fried Prawns', nameBm: 'Udang Goreng Tepung', descEn: 'Crispy golden batter-fried fresh prawns', descBm: 'Udang goreng tepung rangup', price: 15, category: 'lunch', image: '/assets/nasi-campur.jpg' },
  { id: 'sayur_campur', nameEn: 'Mixed Vegetables', nameBm: 'Sayur Campur', descEn: 'Stir-fried mixed vegetables with soft tofu', descBm: 'Sayur campur goreng dengan tahu', price: 5, category: 'lunch', image: '/assets/nasi-campur.jpg' },
  { id: 'kangkung_belacan', nameEn: 'Kangkung Belacan', nameBm: 'Kangkung Belacan', descEn: 'Stir-fried water spinach with spicy shrimp paste', descBm: 'Kangkung tumis belacan pedas', price: 5, category: 'lunch', image: '/assets/nasi-campur.jpg' },
  { id: 'pucuk_paku', nameEn: 'Pucuk Paku Lemak', nameBm: 'Pucuk Paku Masak Lemak', descEn: 'Jungle fern shoots cooked in rich yellow coconut gravy', descBm: 'Pucuk paku masak lemak dengan udang kering', price: 6, category: 'lunch', image: '/assets/nasi-campur.jpg' },
  
  // Hi Tea
  { id: 'currypuff', nameEn: 'Currypuff', nameBm: 'Karipap', descEn: 'Flaky pastry filled with spiced potato curry', descBm: 'Karipap pusing kentang berempah', price: 2.5, category: 'hi tea', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'pisang_goreng', nameEn: 'Banana Fritters', nameBm: 'Pisang Goreng Crisp', descEn: 'Crispy golden fried local sweet bananas', descBm: 'Pisang goreng rangup manis tradisi', price: 3.5, category: 'hi tea', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'samosa', nameEn: 'Samosa', nameBm: 'Samosa Kentang', descEn: 'Fried triangular pastry filled with spiced vegetables', descBm: 'Samosa garing berinti ubi kentang pedas', price: 2.8, category: 'hi tea', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'kuih_talam', nameEn: 'Kuih Talam', nameBm: 'Kuih Talam Pandan', descEn: 'Two-layered traditional steamed sweet pandan cake', descBm: 'Kuih talam pandan kelapa lemak manis', price: 2.5, category: 'hi tea', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'teh_tarik', nameEn: 'Teh Tarik', nameBm: 'Teh Tarik', descEn: 'Foamy frothy traditional pulled sweet milk tea', descBm: 'Teh tarik kaw berbuih pekat manis', price: 2.5, category: 'hi tea', image: '/assets/images/teh_tarik_drawn_1786678155597.jpg' },

  // Drinks
  { id: 'teh_tarik_drink', nameEn: 'Teh Tarik', nameBm: 'Teh Tarik', descEn: 'Traditional foamy pulled milk tea', descBm: 'Teh tarik kaw berbuih pekat manis', price: 2.5, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/teh_tarik_drawn_1786678155597.jpg' },
  { id: 'teh_o', nameEn: 'Teh O', nameBm: 'Teh O', descEn: 'Sweet traditional black tea', descBm: 'Teh hitam manis panas segar', price: 2.0, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/teh_tarik_drawn_1786678155597.jpg' },
  { id: 'kopi', nameEn: 'Kopi Kampung 434', nameBm: 'Kopi Kampung 434', descEn: 'Traditional local roasted coffee with milk', descBm: 'Kopi susu panas kaw 434 tradisional', price: 2.8, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'kopi_o', nameEn: 'Kopi O Kampung', nameBm: 'Kopi O Kampung', descEn: 'Traditional black roasted coffee', descBm: 'Kopi hitam tradisional 434 kaw', price: 2.2, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'nescafe', nameEn: 'Nescafe Panas', nameBm: 'Nescafe Panas', descEn: 'Rich instant coffee with milk', descBm: 'Kopi Nescafe panas bancuh susu', price: 3.0, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'nescafe_o', nameEn: 'Nescafe O', nameBm: 'Nescafe O', descEn: 'Black instant coffee with sugar', descBm: 'Kopi Nescafe hitam manis', price: 2.5, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'milo', nameEn: 'Milo Panas', nameBm: 'Milo Panas', descEn: 'Hot chocolate malt drink with milk', descBm: 'Minuman coklat malt Milo berkrim', price: 3.0, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'milo_o', nameEn: 'Milo O', nameBm: 'Milo O', descEn: 'Hot chocolate malt drink without milk', descBm: 'Minuman coklat malt Milo panas tanpa susu', price: 2.5, category: 'drinks', suitability: 'breakfast_hitea', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'sirap_bandung', nameEn: 'Sirap Bandung Ais', nameBm: 'Sirap Bandung Ais', descEn: 'Chilled pink rose syrup milk drink', descBm: 'Sirap ros bersusu ais sejuk segar', price: 2.8, category: 'drinks', suitability: 'lunch', image: '/assets/images/sirap_bandung_drawn_1786678177483.jpg' },
  { id: 'air_tetra_pak', nameEn: 'Flavored Tetra Pak Drink', nameBm: 'Air Tetra Pak Berperisa', descEn: 'Convenient flavored juice box (Chrysanthemum/Soya)', descBm: 'Air kotak Tetra Pak pelbagai perisa segar', price: 2.5, category: 'drinks', suitability: 'lunch', image: '/assets/images/sirap_bandung_drawn_1786678177483.jpg' },
  { id: 'air_kordial', nameEn: 'Cordial Drink', nameBm: 'Air Kordial Ros / Oren', descEn: 'Chilled sweet rose or orange cordial', descBm: 'Minuman kordial buah manis sejuk segar', price: 1.8, category: 'drinks', suitability: 'lunch', image: '/assets/images/sirap_bandung_drawn_1786678177483.jpg' },
  { id: 'air_mineral_botol', nameEn: 'Bottled Mineral Water', nameBm: 'Air Mineral Botol', descEn: 'Clean bottled drinking mineral water', descBm: 'Air mineral botol bersih menyegarkan', price: 1.5, category: 'drinks', suitability: 'lunch', image: '/assets/images/sirap_bandung_drawn_1786678177483.jpg' },
  { id: 'peel_fresh_kecik', nameEn: 'Peel Fresh Small Tetra Pak', nameBm: 'Tetra Pak Peel Fresh Kecil', descEn: 'Small pasteurized fruit juice box', descBm: 'Kotak Peel Fresh kecil jus buah segar', price: 3.2, category: 'drinks', suitability: 'lunch', image: '/assets/images/sirap_bandung_drawn_1786678177483.jpg' },

  // Expanded items
  { id: 'nasi_goreng_kampung', nameEn: 'Nasi Goreng Kampung', nameBm: 'Nasi Goreng Kampung', descEn: 'Village-style fried rice with bilis and chilli', descBm: 'Nasi goreng kampung dengan bilis dan cili', price: 8.5, category: 'lunch', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'nasi_briyani', nameEn: 'Nasi Briyani Ayam', nameBm: 'Nasi Briyani Ayam', descEn: 'Fragrant spiced rice with chicken', descBm: 'Nasi berempah wangi bersama ayam', price: 15, category: 'lunch', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'lontong_singapore', nameEn: 'Lontong Singapore', nameBm: 'Lontong Singapore', descEn: 'Compressed rice in coconut vegetable gravy', descBm: 'Nasi himpit dalam kuah lodeh bersantan', price: 8.5, category: 'breakfast', image: '/assets/images/lontong_drawn_1786678109750.jpg' },
  { id: 'mee_soto', nameEn: 'Mee Soto Ayam', nameBm: 'Mee Soto Ayam', descEn: 'Aromatic chicken noodle soup with shredded chicken', descBm: 'Mee sup ayam berempah dengan isi ayam', price: 8.0, category: 'breakfast', image: '/assets/images/soto_ayam_drawn_1786678098460.jpg' },
  { id: 'soto_ayam', nameEn: 'Soto Ayam Nasi Impit', nameBm: 'Soto Ayam Nasi Impit', descEn: 'Spiced chicken soup with rice cakes and begedil', descBm: 'Sup ayam berempah dengan nasi himpit dan bergedil', price: 8.5, category: 'lunch', image: '/assets/images/soto_ayam_drawn_1786678098460.jpg' },
  { id: 'bubur_ayam', nameEn: 'Bubur Ayam', nameBm: 'Bubur Ayam', descEn: 'Chicken rice porridge', descBm: 'Bubur nasi ayam', price: 6.5, category: 'breakfast', image: '/assets/images/soto_ayam_drawn_1786678098460.jpg' },
  { id: 'ayam_masak_merah', nameEn: 'Ayam Masak Merah', nameBm: 'Ayam Masak Merah', descEn: 'Chicken in sweet tomato gravy', descBm: 'Ayam dalam kuah tomato manis', price: 9.5, category: 'lunch', image: '/assets/images/ayam_berempah_drawn_1786678122149.jpg' },
  { id: 'ayam_kurma', nameEn: 'Ayam Kurma', nameBm: 'Ayam Kurma', descEn: 'Mild creamy kurma chicken', descBm: 'Ayam kurma lembut', price: 10, category: 'lunch', image: '/assets/images/ayam_berempah_drawn_1786678122149.jpg' },
  { id: 'daging_masak_hitam', nameEn: 'Daging Masak Hitam', nameBm: 'Daging Masak Hitam', descEn: 'Dark soy braised beef', descBm: 'Daging masak kicap hitam', price: 13, category: 'lunch', image: '/assets/images/rendang_daging_drawn_1786678134956.jpg' },
];


// Full market reference catalog (not auto-pushed to live Firebase menu)
export {
  MALAYSIAN_HALAL_CATALOG,
  CATERING_PACKAGE_BANDS,
  catalogToMenuItem,
  getCatalogByGroup,
  getCatalogByCategory,
} from "@/data/malaysianHalalCatalog";
export type { HalalCatalogItem, CatalogMealSlot } from "@/data/malaysianHalalCatalog";
