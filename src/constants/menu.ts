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
}

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // Breakfast
  { id: 'nasi_lemak_biasa', nameEn: 'Nasi Lemak Biasa', nameBm: 'Nasi Lemak Biasa', descEn: 'Aromatic coconut rice with spicy sambal, egg, and peanuts', descBm: 'Nasi lemak harum dengan sambal tumis bilis, telur, timun dan kacang', price: 4, category: 'breakfast' },
  { id: 'nasi_lemak_ayam', nameEn: 'Nasi Lemak Ayam', nameBm: 'Nasi Lemak Ayam Goreeng', descEn: 'Coconut rice served with spiced golden fried chicken', descBm: 'Nasi lemak dengan ayam goreng berempah panas', price: 8, category: 'breakfast' },
  { id: 'mee_goreng', nameEn: 'Mee Goreng Mamak', nameBm: 'Mee Goreng Mamak', descEn: 'Wok-fried yellow noodles with traditional spices', descBm: 'Mee goreng mamak dengan cucur, taukua dan telur', price: 5, category: 'breakfast' },
  { id: 'roti_canai', nameEn: 'Roti Canai', nameBm: 'Roti Canai', descEn: 'Flaky flatbread served with savory dhal curry', descBm: 'Roti canai lembut dan garing bersama kuah dhal', price: 2, category: 'breakfast' },
  { id: 'kuih_muih', nameEn: 'Assorted Malay Kuih', nameBm: 'Kuih-Muih Campur', descEn: 'Sweet and savory traditional hand-crafted delicacies', descBm: 'Aneka pilihan kuih-muih tradisional melayu', price: 3, category: 'breakfast' },
  
  // Lunch
  { id: 'asam_pedas', nameEn: 'Asam Pedas', nameBm: 'Asam Pedas', descEn: 'Fresh fish cooked in spicy, tangy herbal gravy', descBm: 'Ikan segar dimasak asam pedas berempah', price: 12, category: 'lunch' },
  { id: 'ayam_goreng', nameEn: 'Spiced Fried Chicken', nameBm: 'Ayam Goreng Berempah', descEn: 'Crispy fried chicken with aromatic traditional spices', descBm: 'Ayam goreng crispy dengan rempah istimewa', price: 10, category: 'lunch' },
  { id: 'daging_masak_merah', nameEn: 'Beef Masak Merah', nameBm: 'Daging Masak Merah', descEn: 'Tender beef cooked in rich sweet and savory tomato sauce', descBm: 'Daging lembu dimasak merah dengan tomato', price: 14, category: 'lunch' },
  { id: 'sambal_sotong', nameEn: 'Sambal Squid', nameBm: 'Sambal Sotong', descEn: 'Squid cooked in rich chili sambal paste', descBm: 'Sotong dimasak sambal petai', price: 13, category: 'lunch' },
  { id: 'ikan_keli', nameEn: 'Sambal Catfish', nameBm: 'Ikan Keli Sambal', descEn: 'Crispy fried catfish tossed in fiery house sambal', descBm: 'Ikan keli goreng dengan sambal', price: 11, category: 'lunch' },
  { id: 'rendang_daging', nameEn: 'Beef Rendang', nameBm: 'Rendang Daging', descEn: 'Slow-cooked traditional caramelized beef curry', descBm: 'Rendang daging lembu tradisional', price: 15, category: 'lunch' },
  { id: 'kari_kambing', nameEn: 'Mutton Curry', nameBm: 'Kari Kambing', descEn: 'Rich, thick spiced mutton curry', descBm: 'Kari kambing berempah pekat', price: 16, category: 'lunch' },
  { id: 'udang_goreng', nameEn: 'Crispy Fried Prawns', nameBm: 'Udang Goreng Tepung', descEn: 'Crispy golden batter-fried fresh prawns', descBm: 'Udang goreng tepung rangup', price: 14, category: 'lunch' },
  { id: 'sayur_campur', nameEn: 'Mixed Vegetables', nameBm: 'Sayur Campur', descEn: 'Stir-fried mixed vegetables with soft tofu', descBm: 'Sayur campur goreng dengan tahu', price: 5, category: 'lunch' },
  { id: 'kangkung_belacan', nameEn: 'Kangkung Belacan', nameBm: 'Kangkung Belacan', descEn: 'Stir-fried water spinach with spicy shrimp paste', descBm: 'Kangkung tumis belacan pedas', price: 5, category: 'lunch' },
  { id: 'pucuk_paku', nameEn: 'Pucuk Paku Lemak', nameBm: 'Pucuk Paku Masak Lemak', descEn: 'Jungle fern shoots cooked in rich yellow coconut gravy', descBm: 'Pucuk paku masak lemak dengan udang kering', price: 6, category: 'lunch' },
  
  // Hi Tea
  { id: 'currypuff', nameEn: 'Currypuff', nameBm: 'Karipap', descEn: 'Flaky pastry filled with spiced potato curry', descBm: 'Karipap pusing kentang berempah', price: 2.5, category: 'hi tea' },
  { id: 'pisang_goreng', nameEn: 'Banana Fritters', nameBm: 'Pisang Goreng Crisp', descEn: 'Crispy golden fried local sweet bananas', descBm: 'Pisang goreng rangup manis tradisi', price: 3, category: 'hi tea' },
  { id: 'samosa', nameEn: 'Samosa', nameBm: 'Samosa Kentang', descEn: 'Fried triangular pastry filled with spiced vegetables', descBm: 'Samosa garing berinti ubi kentang pedas', price: 2.8, category: 'hi tea' },
  { id: 'kuih_talam', nameEn: 'Kuih Talam', nameBm: 'Kuih Talam Pandan', descEn: 'Two-layered traditional steamed sweet pandan cake', descBm: 'Kuih talam pandan kelapa lemak manis', price: 2.5, category: 'hi tea' },
  { id: 'teh_tarik', nameEn: 'Teh Tarik', nameBm: 'Teh Tarik', descEn: 'Foamy frothy traditional pulled sweet milk tea', descBm: 'Teh tarik kaw berbuih pekat manis', price: 2, category: 'hi tea' },

  // Drinks
  { id: 'teh_tarik_drink', nameEn: 'Teh Tarik', nameBm: 'Teh Tarik', descEn: 'Traditional foamy pulled milk tea', descBm: 'Teh tarik kaw berbuih pekat manis', price: 2, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'teh_o', nameEn: 'Teh O', nameBm: 'Teh O', descEn: 'Sweet traditional black tea', descBm: 'Teh hitam manis panas segar', price: 1.8, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'kopi', nameEn: 'Kopi', nameBm: 'Kopi', descEn: 'Traditional local coffee with milk', descBm: 'Kopi susu panas kaw tradisional', price: 2.2, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'kopi_o', nameEn: 'Kopi O', nameBm: 'Kopi O', descEn: 'Traditional black coffee', descBm: 'Kopi hitam tradisional kaw', price: 1.8, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'nescafe', nameEn: 'Nescafe', nameBm: 'Nescafe', descEn: 'Rich instant coffee with milk', descBm: 'Kopi Nescafe panas bancuh susu', price: 2.5, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'nescafe_o', nameEn: 'Nescafe O', nameBm: 'Nescafe O', descEn: 'Black instant coffee with sugar', descBm: 'Kopi Nescafe hitam manis', price: 2.2, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'milo', nameEn: 'Milo', nameBm: 'Milo', descEn: 'Hot chocolate malt drink with milk', descBm: 'Minuman coklat malt Milo berkrim', price: 2.5, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'milo_o', nameEn: 'Milo O', nameBm: 'Milo O', descEn: 'Hot chocolate malt drink without milk', descBm: 'Minuman coklat malt Milo panas tanpa susu', price: 2.2, category: 'drinks', suitability: 'breakfast_hitea' },
  
  { id: 'air_tetra_pak', nameEn: 'Flavored Tetra Pak Drink', nameBm: 'Air Tetra Pak Berperisa', descEn: 'Convenient flavored juice box (Chrysanthemum/Soya)', descBm: 'Air kotak Tetra Pak pelbagai perisa segar', price: 2, category: 'drinks', suitability: 'lunch' },
  { id: 'air_kordial', nameEn: 'Cordial Drink', nameBm: 'Air Kordial', descEn: 'Chilled sweet rose/orange cordial', descBm: 'Minuman kordial buah manis sejuk segar', price: 1.5, category: 'drinks', suitability: 'lunch' },
  { id: 'air_mineral_botol', nameEn: 'Bottled Mineral Water', nameBm: 'Air Mineral Botol', descEn: 'Clean bottled drinking mineral water', descBm: 'Air mineral botol bersih menyegarkan', price: 1.5, category: 'drinks', suitability: 'lunch' },
  { id: 'peel_fresh_kecik', nameEn: 'Peel Fresh Small Tetra Pak', nameBm: 'Tetra Pak Peel Fresh Kecil', descEn: 'Small pasteurized fruit juice box', descBm: 'Kotak Peel Fresh kecil jus buah segar', price: 2.8, category: 'drinks', suitability: 'lunch' },
  { id: 'tetra_pak_mineral_water', nameEn: 'Tetra Pak Mineral Water', nameBm: 'Tetra Pak Mineral Water', descEn: 'Eco-friendly boxed mineral water', descBm: 'Air mineral kotak Tetra Pak mesra alam', price: 2, category: 'drinks', suitability: 'lunch' },

  // —— Expanded common Halal Malay items (market-guided prices) ——
  { id: 'nasi_goreng_kampung', nameEn: 'Nasi Goreng Kampung', nameBm: 'Nasi Goreng Kampung', descEn: 'Village-style fried rice with bilis and chilli', descBm: 'Nasi goreng kampung dengan bilis dan cili', price: 8, category: 'lunch' },
  { id: 'nasi_briyani', nameEn: 'Nasi Briyani', nameBm: 'Nasi Briyani', descEn: 'Fragrant spiced rice with chicken or mutton', descBm: 'Nasi berempah wangi bersama ayam atau kambing', price: 14, category: 'lunch' },
  { id: 'lontong_singapore', nameEn: 'Lontong Singapore', nameBm: 'Lontong Singapore', descEn: 'Compressed rice in coconut vegetable gravy', descBm: 'Nasi himpit dalam kuah lodeh bersantan', price: 8, category: 'breakfast' },
  { id: 'mee_rebus', nameEn: 'Mee Rebus', nameBm: 'Mee Rebus', descEn: 'Yellow noodles in thick sweet-spicy gravy', descBm: 'Mee dalam kuah pekat manis-pedas', price: 7.5, category: 'lunch' },
  { id: 'mee_siam', nameEn: 'Mee Siam', nameBm: 'Mee Siam', descEn: 'Rice vermicelli in tangy spicy gravy', descBm: 'Bihun dalam kuah masam-pedas', price: 7.5, category: 'lunch' },
  { id: 'mee_kari', nameEn: 'Mee Kari', nameBm: 'Mee Kari', descEn: 'Noodles in coconut curry broth', descBm: 'Mee dalam kuah kari bersantan', price: 9, category: 'lunch' },
  { id: 'soto_ayam', nameEn: 'Soto Ayam', nameBm: 'Soto Ayam', descEn: 'Spiced chicken soup with rice cakes', descBm: 'Sup ayam berempah dengan nasi himpit', price: 8, category: 'lunch' },
  { id: 'bubur_ayam', nameEn: 'Bubur Ayam', nameBm: 'Bubur Ayam', descEn: 'Chicken rice porridge', descBm: 'Bubur nasi ayam', price: 6, category: 'breakfast' },
  { id: 'ayam_masak_merah', nameEn: 'Ayam Masak Merah', nameBm: 'Ayam Masak Merah', descEn: 'Chicken in sweet tomato gravy', descBm: 'Ayam dalam kuah tomato manis', price: 9, category: 'lunch' },
  { id: 'ayam_kurma', nameEn: 'Ayam Kurma', nameBm: 'Ayam Kurma', descEn: 'Mild creamy kurma chicken', descBm: 'Ayam kurma lembut', price: 10, category: 'lunch' },
  { id: 'daging_masak_hitam', nameEn: 'Daging Masak Hitam', nameBm: 'Daging Masak Hitam', descEn: 'Dark soy braised beef', descBm: 'Daging masak kicap hitam', price: 12, category: 'lunch' },
  { id: 'kangkung_belacan', nameEn: 'Kangkung Belacan', nameBm: 'Kangkung Goreng Belacan', descEn: 'Water spinach with shrimp paste', descBm: 'Kangkung tumis belacan', price: 5, category: 'lunch' },
  { id: 'rojak_singapore', nameEn: 'Rojak Singapore', nameBm: 'Rojak Singapore', descEn: 'Mixed fritters with thick sweet-spicy sauce', descBm: 'Goreng campur dengan kuah manis-pedas', price: 7, category: 'hi tea' },
  { id: 'roti_telur', nameEn: 'Roti Telur', nameBm: 'Roti Telur', descEn: 'Roti canai with egg', descBm: 'Roti canai bergaul telur', price: 3, category: 'breakfast' },
  { id: 'teh_tarik', nameEn: 'Teh Tarik', nameBm: 'Teh Tarik', descEn: 'Pulled milk tea', descBm: 'Teh susu ditarik', price: 2.5, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'teh_o_ais', nameEn: 'Teh O Ais', nameBm: 'Teh O Ais', descEn: 'Iced black tea', descBm: 'Teh o sejuk', price: 2.2, category: 'drinks', suitability: 'breakfast_hitea' },
  { id: 'sirap_bandung', nameEn: 'Sirap Bandung', nameBm: 'Sirap Bandung', descEn: 'Rose syrup milk drink', descBm: 'Sirap ros bersusu', price: 2.5, category: 'drinks', suitability: 'lunch' },
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
