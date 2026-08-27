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

export interface FeaturedMenuItem extends MenuItem {
  priceEn: string;
  priceBm: string;
  tags?: string[];
}

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // ==========================================
  // SARAPAN PAGI (Breakfast) - Makanan
  // ==========================================
  {
    id: 'nasi_lemak_sambal_sotong',
    nameEn: 'Nasi Lemak Sambal Sotong',
    nameBm: 'Nasi Lemak Sambal Sotong',
    descEn: 'Fragrant coconut rice with rich squid sambal, egg, cucumber & peanuts',
    descBm: 'Nasi lemak harum bersama sambal sotong pekat, telur, timun & kacang',
    price: 11.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/nasi_lemak.jpg'
  },
  {
    id: 'laksa_johor_sarapan',
    nameEn: 'Laksa Johor',
    nameBm: 'Laksa Johor',
    descEn: 'Traditional Johor laksa with spaghetti, rich fish gravy, fresh herbs & lime',
    descBm: 'Laksa Johor tradisi dengan spageti, kuah ikan pekat, ulam-ulaman segar & limau',
    price: 11.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/laksa_johor.jpg'
  },
  {
    id: 'asam_laksa_sarapan',
    nameEn: 'Asam Laksa',
    nameBm: 'Asam Laksa',
    descEn: 'Tangy and spicy fish broth noodles with cucumber, pineapple & mint',
    descBm: 'Mi laksa kuah asam pedas ikan bersama timun, nanas & daun pudina',
    price: 10.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/asam_laksa.jpg'
  },
  {
    id: 'mee_kari_sarapan',
    nameEn: 'Mee Kari',
    nameBm: 'Mee Kari',
    descEn: 'Yellow noodles in rich curry gravy with tofu puffs, cockles & egg',
    descBm: 'Mi kuning dalam kuah kari santan pekat bersama tauhu pok, kerang & telur',
    price: 10.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/mee_kari.jpg'
  },
  {
    id: 'lontong_singapore',
    nameEn: 'Lontong Singapore',
    nameBm: 'Lontong Singapore',
    descEn: 'Compressed rice cakes in rich lodeh vegetable gravy with serunding & sambal',
    descBm: 'Nasi himpit kuah lodeh sayuran bersantan pekat bersama serunding kelapa & sambal',
    price: 9.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/lontong.jpg'
  },
  {
    id: 'soto_ayam_sarapan',
    nameEn: 'Soto Ayam',
    nameBm: 'Soto Ayam',
    descEn: 'Spiced clear chicken broth with compressed rice cubes, shredded chicken & begedil',
    descBm: 'Sup ayam berempah dengan nasi himpit, carikan ayam, kacang & bergedil kentang',
    price: 9.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/soto_ayam.jpg'
  },
  {
    id: 'mee_soto_sarapan',
    nameEn: 'Mee Soto',
    nameBm: 'Mee Soto',
    descEn: 'Yellow noodles in spiced chicken broth with shredded chicken & sambal kicap',
    descBm: 'Mi kuning dalam sup ayam berempah dengan carikan ayam & sambal kicap pedas',
    price: 9.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/soto_ayam.jpg'
  },
  {
    id: 'nasi_lemak_ayam_goreng',
    nameEn: 'Nasi Lemak Ayam Goreng',
    nameBm: 'Nasi Lemak Ayam Goreng',
    descEn: 'Coconut rice with spiced crispy fried chicken, sambal tumis & condiments',
    descBm: 'Nasi lemak santan wangi bersama ayam goreng berempah rangup & sambal tumis',
    price: 9.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/nasi_lemak.jpg'
  },
  {
    id: 'mee_siam_sarapan',
    nameEn: 'Mee Siam',
    nameBm: 'Mee Siam',
    descEn: 'Stir-fried tangy spicy rice vermicelli served with egg, tofu & sambal',
    descBm: 'Bihun goreng siam masam manis pedas dihidang bersama telur, taukua & sambal',
    price: 9.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/laksa_johor.jpg'
  },
  {
    id: 'mee_rebus_sarapan',
    nameEn: 'Mee Rebus',
    nameBm: 'Mee Rebus',
    descEn: 'Yellow noodles in sweet potato-based spiced gravy with egg, tofu & lime',
    descBm: 'Mi kuning dengan kuah pekat keledek berempah bersama telur, tauhu & limau kasturi',
    price: 9.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/mee_kari.jpg'
  },
  {
    id: 'bihun_goreng',
    nameEn: 'Bihun Goreng',
    nameBm: 'Bihun Goreng',
    descEn: 'Traditional Malaysian style stir-fried rice vermicelli with vegetables',
    descBm: 'Bihun goreng kampung tradisi dengan sayur-sayuran dan perencah lazat',
    price: 8.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/bihun_goreng.jpg'
  },
  {
    id: 'maggi_goreng',
    nameEn: 'Maggi Goreng',
    nameBm: 'Maggi Goreng',
    descEn: 'Wok-tossed springy noodles with egg, tofu and fresh greens',
    descBm: 'Mi Maggi goreng kuali panas dengan telur, sayur dan tauhu',
    price: 8.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/mee_goreng.jpg'
  },
  {
    id: 'bubur_ayam',
    nameEn: 'Bubur Ayam',
    nameBm: 'Bubur Ayam',
    descEn: 'Silky smooth chicken porridge with scallions, fried shallots & ginger',
    descBm: 'Bubur nasi ayam lembut aromatik bersama daun bawang, bawang goreng & halia',
    price: 7.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/soto_ayam.jpg'
  },
  {
    id: 'mee_goreng_mamak',
    nameEn: 'Mee Goreng Mamak',
    nameBm: 'Mee Goreng Mamak',
    descEn: 'Wok-fried spicy yellow noodles with potatoes, tofu, egg and calamansi',
    descBm: 'Mi goreng mamak pedas berkicap dengan kentang, tauhu, telur & limau kasturi',
    price: 7.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/mee_goreng.jpg'
  },
  {
    id: 'roti_sardin',
    nameEn: 'Roti Sardin',
    nameBm: 'Roti Sardin',
    descEn: 'Pan-toasted flatbread stuffed with savory spiced sardine filling',
    descBm: 'Roti canai bakar berinti sambal sardin pedas berempah',
    price: 5.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/roti_canai.jpg'
  },
  {
    id: 'nasi_lemak_biasa',
    nameEn: 'Nasi Lemak Biasa',
    nameBm: 'Nasi Lemak Biasa',
    descEn: 'Classic coconut rice with sweet spicy sambal, boiled egg, cucumber & peanuts',
    descBm: 'Nasi lemak daun pisang klasik bersama sambal tumis, telur rebus, timun & kacang',
    price: 5.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/nasi_lemak.jpg'
  },
  {
    id: 'roti_telur',
    nameEn: 'Roti Telur',
    nameBm: 'Roti Telur',
    descEn: 'Flaky flatbread filled with beaten egg, served with dhal curry',
    descBm: 'Roti canai lembut berinti telur dihidang bersama kuah dhal & kari',
    price: 4.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/roti_canai.jpg'
  },
  {
    id: 'roti_boom',
    nameEn: 'Roti Boom',
    nameBm: 'Roti Boom',
    descEn: 'Thick, buttery and slightly sweet layered crispy flatbread',
    descBm: 'Roti boom tebal, rangup, manis berlemak marjerin',
    price: 4.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/roti_boom.jpg'
  },
  {
    id: 'tosai',
    nameEn: 'Tosai',
    nameBm: 'Tosai',
    descEn: 'Crispy fermented crepe served with coconut chutney & dhal sambar',
    descBm: 'Tosai garing tradisi dihidang bersama kuah kari dhal & chutney kelapa',
    price: 3.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/tosai.jpg'
  },
  {
    id: 'roti_canai',
    nameEn: 'Roti Canai',
    nameBm: 'Roti Canai',
    descEn: 'Crispy, flaky traditional flatbread served with savory dhal curry',
    descBm: 'Roti canai garing lembut di luar bersama kuah dhal aromatik',
    price: 3.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/roti_canai.jpg'
  },
  {
    id: 'kuih_muih_campur_sarapan',
    nameEn: 'Kuih Muih Campur',
    nameBm: 'Kuih Muih Campur',
    descEn: 'Assorted traditional Malay sweet and savory hand-crafted kuih (2 pcs)',
    descBm: 'Aneka hidangan kuih-muih tradisional Melayu manis & berempah',
    price: 3.00,
    category: 'breakfast',
    image: '/assets/dishes/vector/kuih_muih.jpg'
  },
  {
    id: 'telur_mata_sapi_sarapan',
    nameEn: 'Telur Mata Sapi',
    nameBm: 'Telur Mata Sapi',
    descEn: 'Sunny side up fried egg with crispy edges',
    descBm: 'Telur goreng mata sapi kuning cair menyelerakan',
    price: 2.50,
    category: 'breakfast',
    image: '/assets/dishes/vector/telur_mata_sapi.jpg'
  },

  // ==========================================
  // MAKAN TENGAHARI (Lunch) - Makanan
  // ==========================================
  {
    id: 'kari_kambing',
    nameEn: 'Kari Kambing',
    nameBm: 'Kari Kambing',
    descEn: 'Tender mutton slow-cooked in thick, aromatic spiced curry gravy',
    descBm: 'Daging kambing lembut dimasak kari berempah pekat tradisi',
    price: 19.00,
    category: 'lunch',
    image: '/assets/dishes/vector/kari_kambing.jpg'
  },
  {
    id: 'rendang_daging',
    nameEn: 'Rendang Daging',
    nameBm: 'Rendang Daging',
    descEn: 'Slow-cooked caramelized beef in rich coconut milk and toasted kerisik',
    descBm: 'Rendang daging lembu tok asli dengan kerisik wangi dan santan pekat',
    price: 17.00,
    category: 'lunch',
    image: '/assets/dishes/vector/rendang_daging.jpg'
  },
  {
    id: 'sambal_udang',
    nameEn: 'Sambal Udang',
    nameBm: 'Sambal Udang',
    descEn: 'Succulent fresh prawns simmered in sweet and spicy chili sambal',
    descBm: 'Udang laut segar dimasak sambal tumis pedas manis menyelerakan',
    price: 17.00,
    category: 'lunch',
    image: '/assets/dishes/vector/sambal_udang.jpg'
  },
  {
    id: 'udang_goreng_tepung',
    nameEn: 'Udang Goreng Tepung',
    nameBm: 'Udang Goreng Tepung',
    descEn: 'Crisp golden batter-fried whole prawns with sweet chili dip',
    descBm: 'Udang goreng tepung celup rangup keemasan',
    price: 16.00,
    category: 'lunch',
    image: '/assets/dishes/vector/sambal_udang.jpg'
  },
  {
    id: 'nasi_briyani',
    nameEn: 'Nasi Briyani',
    nameBm: 'Nasi Briyani',
    descEn: 'Fragrant basmati rice cooked with saffron spices, served with dalcha & acar',
    descBm: 'Nasi briyani beras basmati wangi berempah bersama kuah dalca & acar buah',
    price: 16.00,
    category: 'lunch',
    image: '/assets/dishes/vector/nasi_briyani.jpg'
  },
  {
    id: 'dendeng',
    nameEn: 'Dendeng',
    nameBm: 'Dendeng',
    descEn: 'Thinly sliced crispy beef glazed in sweet, tangy caramelized chili glaze',
    descBm: 'Daging dendeng kepingan rangup disalut sambal kicap manis pedas',
    price: 16.00,
    category: 'lunch',
    image: '/assets/dishes/vector/rendang_daging.jpg'
  },
  {
    id: 'daging_masak_merah',
    nameEn: 'Daging Masak Merah',
    nameBm: 'Daging Masak Merah',
    descEn: 'Tender beef slices in rich, savory sweet tomato and chili sauce',
    descBm: 'Daging lembu lembut dimasak sos merah tomato, bawang dan lada benggala',
    price: 16.00,
    category: 'lunch',
    image: '/assets/dishes/vector/rendang_daging.jpg'
  },
  {
    id: 'sambal_sotong',
    nameEn: 'Sambal Sotong',
    nameBm: 'Sambal Sotong',
    descEn: 'Fresh tender squid cooked in caramelized spicy chili onion sambal',
    descBm: 'Sotong segar lembut dimasak sambal tumis bawang beraroma',
    price: 15.00,
    category: 'lunch',
    image: '/assets/dishes/vector/sambal_udang.jpg'
  },
  {
    id: 'asam_pedas',
    nameEn: 'Asam Pedas',
    nameBm: 'Asam Pedas',
    descEn: 'Signature spicy and sour herbal tamarind stew with daun kesum & bunga kantan',
    descBm: 'Masakan asam pedas Melaka asli pekat dengan daun kesum & bunga kantan',
    price: 14.00,
    category: 'lunch',
    image: '/assets/dishes/vector/asam_pedas.jpg'
  },
  {
    id: 'daging_masak_hitam',
    nameEn: 'Daging Masak Hitam',
    nameBm: 'Daging Masak Hitam',
    descEn: 'Slow braised beef in dark spiced caramel soy sauce with raisins & shallots',
    descBm: 'Daging lembu masak hitam manis berempah dengan kismis dan bawang karamel',
    price: 14.00,
    category: 'lunch',
    image: '/assets/dishes/vector/rendang_daging.jpg'
  },
  {
    id: 'ikan_keli_sambal',
    nameEn: 'Ikan Keli Sambal',
    nameBm: 'Ikan Keli Sambal',
    descEn: 'Crispy fried catfish smothered in fiery traditional red sambal',
    descBm: 'Ikan keli goreng garing disalut sambal tumis merah pedas menyengat',
    price: 13.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ikan_keli.jpg'
  },
  {
    id: 'ikan_goreng_berlada',
    nameEn: 'Ikan Goreng Berlada',
    nameBm: 'Ikan Goreng Berlada',
    descEn: 'Deep-fried crispy whole fish topped with crushed red & green chili paste',
    descBm: 'Ikan goreng garing ditumis dengan cili merah & hijau tumbuk',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ikan_keli.jpg'
  },
  {
    id: 'masak_lemak_cili_api',
    nameEn: 'Masak Lemak Cili Api',
    nameBm: 'Masak Lemak Cili Api',
    descEn: 'Creamy yellow coconut turmeric curry cooked with fiery bird’s eye chilies',
    descBm: 'Gulai kuning santan cili api Negeri Sembilan pekat pedas berkrim',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/vector/masak_lemak.jpg'
  },
  {
    id: 'ayam_paprik',
    nameEn: 'Ayam Paprik',
    nameBm: 'Ayam Paprik',
    descEn: 'Stir-fried chicken chunks with lemongrass, kaffir lime leaves & long beans',
    descBm: 'Ayam paprik ditumis bersama serai, daun limau purut dan sayuran segar',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ayam_berempah.jpg'
  },
  {
    id: 'rendang_ayam',
    nameEn: 'Rendang Ayam',
    nameBm: 'Rendang Ayam',
    descEn: 'Chicken pieces slow simmered in rich spiced coconut and kerisik sauce',
    descBm: 'Rendang ayam tradisi dengan kerisik wangi dan aroma daun kunyit',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/vector/rendang_daging.jpg'
  },
  {
    id: 'ayam_kurma',
    nameEn: 'Ayam Kurma',
    nameBm: 'Ayam Kurma',
    descEn: 'Mild and aromatic spiced chicken curry with potatoes, coriander & spices',
    descBm: 'Gulai kurma ayam berempah wangi bersama kentang dan tomato',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ayam_berempah.jpg'
  },
  {
    id: 'ayam_goreng_berempah',
    nameEn: 'Ayam Goreng Berempah',
    nameBm: 'Ayam Goreng Berempah',
    descEn: 'Deep-fried bone-in chicken marinated with lemongrass, turmeric & crispy spice crumbs',
    descBm: 'Ayam goreng berempah panas dengan serdak serai & ketumbar rangup',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ayam_berempah.jpg'
  },
  {
    id: 'nasi_campur',
    nameEn: 'Nasi Campur',
    nameBm: 'Nasi Campur',
    descEn: 'Steamed white rice accompanied by a complete balanced lunch dish set',
    descBm: 'Set hidangan lengkap Nasi Campur dengan pilihan lauk tengahari',
    price: 12.00,
    category: 'lunch',
    image: '/assets/dishes/photos/nasi-campur.jpg'
  },
  {
    id: 'ayam_masak_kicap',
    nameEn: 'Ayam Masak Kicap',
    nameBm: 'Ayam Masak Kicap',
    descEn: 'Chicken simmered in savory sweet soy sauce with onions and sliced chilies',
    descBm: 'Ayam masak kicap manis pekat bersama hirisan bawang besar dan cili',
    price: 11.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ayam_berempah.jpg'
  },
  {
    id: 'ayam_masak_merah',
    nameEn: 'Ayam Masak Merah',
    nameBm: 'Ayam Masak Merah',
    descEn: 'Tender fried chicken simmered in rich sweet and savory tomato chili sauce',
    descBm: 'Ayam masak merah kenduri bersama sos tomato pekat dan kacang pis',
    price: 11.00,
    category: 'lunch',
    image: '/assets/dishes/vector/ayam_berempah.jpg'
  },
  {
    id: 'nasi_goreng_kampung',
    nameEn: 'Nasi Goreng Kampung',
    nameBm: 'Nasi Goreng Kampung',
    descEn: 'Traditional village-style fried rice with crunchy anchovies, water spinach & chili',
    descBm: 'Nasi goreng kampung dengan ikan bilis garing, kangkung dan cili padi tumbuk',
    price: 10.00,
    category: 'lunch',
    image: '/assets/dishes/vector/nasi_lemak.jpg'
  },
  {
    id: 'nasi_goreng_cina',
    nameEn: 'Nasi Goreng Cina',
    nameBm: 'Nasi Goreng Cina',
    descEn: 'Non-spicy wok fried rice with eggs, mixed vegetables and fragrant sesame oil',
    descBm: 'Nasi goreng Cina harum tidak pedas bersama telur dan sayur campur',
    price: 9.50,
    category: 'lunch',
    image: '/assets/dishes/vector/nasi_lemak.jpg'
  },
  {
    id: 'pucuk_paku_masak_lemak',
    nameEn: 'Pucuk Paku Masak Lemak',
    nameBm: 'Pucuk Paku Masak Lemak',
    descEn: 'Tender jungle fern shoots cooked in fragrant yellow coconut turmeric gravy',
    descBm: 'Pucuk paku segar dimasak lemak kuning santan bersama udang kering',
    price: 8.00,
    category: 'lunch',
    image: '/assets/dishes/vector/masak_lemak.jpg'
  },
  {
    id: 'kerabu',
    nameEn: 'Kerabu',
    nameBm: 'Kerabu',
    descEn: 'Traditional fresh herb and vegetable salad tossed in tangy lime and toasted coconut dressing',
    descBm: 'Ulam-ulaman kerabu tradisi bersama kerisik, limau kasturi dan sambal belacan',
    price: 8.00,
    category: 'lunch',
    image: '/assets/dishes/vector/masak_lemak.jpg'
  },
  {
    id: 'kangkung_belacan',
    nameEn: 'Kangkung Belacan',
    nameBm: 'Kangkung Belacan',
    descEn: 'Water spinach flash-fried in fiery shrimp paste sambal',
    descBm: 'Kangkung segar ditumis dengan sambal belacan harum pedas berapi',
    price: 7.00,
    category: 'lunch',
    image: '/assets/dishes/vector/masak_lemak.jpg'
  },
  {
    id: 'sayur_campur',
    nameEn: 'Sayur Campur',
    nameBm: 'Sayur Campur',
    descEn: 'Stir-fried medley of cauliflower, carrots, young corn, and broccoli',
    descBm: 'Sayur-sayuran campur segar ditumis rangup bersama bawang putih',
    price: 7.00,
    category: 'lunch',
    image: '/assets/dishes/vector/masak_lemak.jpg'
  },
  {
    id: 'nasi_tomato',
    nameEn: 'Nasi Tomato',
    nameBm: 'Nasi Tomato',
    descEn: 'Aromatic tomato and ghee infused rice with whole sweet spices',
    descBm: 'Nasi tomato wangi dimasak dengan minyak sapi, tomato puree & rempah ratus',
    price: 6.00,
    category: 'lunch',
    image: '/assets/dishes/vector/nasi_briyani.jpg'
  },
  {
    id: 'taugeh_goreng',
    nameEn: 'Taugeh Goreng',
    nameBm: 'Taugeh Goreng',
    descEn: 'Quick stir-fried crunchy bean sprouts with tofu, scallions and salted fish',
    descBm: 'Taugeh rangup ditumis bersama tauhu, kucai dan ikan masin',
    price: 5.50,
    category: 'lunch',
    image: '/assets/dishes/vector/masak_lemak.jpg'
  },
  {
    id: 'nasi_minyak',
    nameEn: 'Nasi Minyak',
    nameBm: 'Nasi Minyak',
    descEn: 'Traditional fragrant ghee rice cooked with shallots, ginger and whole spices',
    descBm: 'Nasi minyak tradisi wangi berlemak dengan rempah ratus kenduri',
    price: 5.00,
    category: 'lunch',
    image: '/assets/dishes/vector/nasi_briyani.jpg'
  },
  {
    id: 'telur_dadar',
    nameEn: 'Telur Dadar',
    nameBm: 'Telur Dadar',
    descEn: 'Fluffy golden omelette with onions and red chilies',
    descBm: 'Telur dadar goreng gebu dengan hirisan bawang besar dan cili',
    price: 2.50,
    category: 'lunch',
    image: '/assets/dishes/vector/roti_canai.jpg'
  },
  {
    id: 'telur_mata_sapi_lunch',
    nameEn: 'Telur Mata Sapi',
    nameBm: 'Telur Mata Sapi',
    descEn: 'Crisp fried egg with runny golden yolk',
    descBm: 'Telur mata sapi goreng garing',
    price: 2.50,
    category: 'lunch',
    image: '/assets/dishes/vector/nasi_lemak.jpg'
  },
  {
    id: 'bergedil',
    nameEn: 'Bergedil',
    nameBm: 'Bergedil',
    descEn: 'Deep-fried seasoned potato patty with minced beef and aromatics',
    descBm: 'Bergedil kentang goreng disalut telur beraroma daging & daun sup',
    price: 3.00,
    category: 'lunch',
    image: '/assets/dishes/vector/soto_ayam.jpg'
  },

  // ==========================================
  // MINUM PETANG (Hi Tea) - Makanan
  // ==========================================
  {
    id: 'laksa_johor_petang',
    nameEn: 'Laksa Johor',
    nameBm: 'Laksa Johor',
    descEn: 'Johor laksa with spaghetti, rich fish gravy and aromatic condiments',
    descBm: 'Laksa Johor tradisi dengan kuah ikan pekat dan ulam-ulaman segar',
    price: 11.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/laksa_johor.jpg'
  },
  {
    id: 'asam_laksa_petang',
    nameEn: 'Asam Laksa',
    nameBm: 'Asam Laksa',
    descEn: 'Tangy tamarind fish broth rice noodles with fresh mint and pineapples',
    descBm: 'Mi laksa asam pedas beraroma dengan hirisan nanas, timun dan pudina',
    price: 10.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/asam_laksa.jpg'
  },
  {
    id: 'mee_kari_petang',
    nameEn: 'Mee Kari',
    nameBm: 'Mee Kari',
    descEn: 'Rich coconut curry noodles with bean curd puffs, fishcake & egg',
    descBm: 'Mi kari berkuah pekat santan bersama tauhu pok dan telur',
    price: 10.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/mee_kari.jpg'
  },
  {
    id: 'soto_ayam_petang',
    nameEn: 'Soto Ayam',
    nameBm: 'Soto Ayam',
    descEn: 'Aromatic chicken broth with rice cubes, shredded chicken and begedil',
    descBm: 'Sup ayam berempah pekat bersama nasi himpit dan bergedil kentang',
    price: 9.50,
    category: 'hi tea',
    image: '/assets/dishes/vector/soto_ayam.jpg'
  },
  {
    id: 'mee_soto_petang',
    nameEn: 'Mee Soto',
    nameBm: 'Mee Soto',
    descEn: 'Spiced chicken soup noodles with shredded chicken and dark chili sambal',
    descBm: 'Mi sup ayam berempah harum bersama sambal kicap pedas',
    price: 9.50,
    category: 'hi tea',
    image: '/assets/dishes/vector/soto_ayam.jpg'
  },
  {
    id: 'mee_siam_petang',
    nameEn: 'Mee Siam',
    nameBm: 'Mee Siam',
    descEn: 'Sweet, sour and spicy stir-fried vermicelli with egg and lime',
    descBm: 'Bihun goreng siam masam manis pedas bersama telur dan limau',
    price: 9.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/bihun_goreng.jpg'
  },
  {
    id: 'mee_rebus_petang',
    nameEn: 'Mee Rebus',
    nameBm: 'Mee Rebus',
    descEn: 'Yellow noodles in savory sweet potato broth with boiled egg and tofu',
    descBm: 'Mi rebus kuah pekat keledek manis berempah bersama telur dan tauhu',
    price: 9.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/mee_kari.jpg'
  },
  {
    id: 'rojak_singapore',
    nameEn: 'Rojak Singapore',
    nameBm: 'Rojak Singapore',
    descEn: 'Crispy dough fritters, tofu, cucumber tossed in rich sweet spicy prawn paste sauce',
    descBm: 'Rojak tauhu, timun dan cakoi rangup digaul sos petis manis pedas & kacang tumbuk',
    price: 9.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/rojak_singapore.jpg'
  },
  {
    id: 'rojak_buah',
    nameEn: 'Rojak Buah',
    nameBm: 'Rojak Buah',
    descEn: 'Fresh tropical fruit slices tossed in sticky sweet spicy shrimp paste dressing and crushed peanuts',
    descBm: 'Campuran buah-buahan segar bersama sos rojak pekat dan taburan kacang garing',
    price: 8.50,
    category: 'hi tea',
    image: '/assets/dishes/vector/rojak_singapore.jpg'
  },
  {
    id: 'popia',
    nameEn: 'Popia',
    nameBm: 'Popia',
    descEn: 'Crispy spring rolls with seasoned turnip, carrot & bean sprout filling',
    descBm: 'Popia goreng garing berinti sayuran sengkuang manis berempah',
    price: 4.50,
    category: 'hi tea',
    image: '/assets/dishes/vector/pisang_goreng.jpg'
  },
  {
    id: 'pisang_goreng_crisp',
    nameEn: 'Pisang Goreng Crisp',
    nameBm: 'Pisang Goreng Crisp',
    descEn: 'Crispy battered local sweet bananas fried golden brown',
    descBm: 'Pisang goreng bertepung rangup rangup manis keemasan',
    price: 4.50,
    category: 'hi tea',
    image: '/assets/dishes/vector/pisang_goreng.jpg'
  },
  {
    id: 'samosa_kentang',
    nameEn: 'Samosa Kentang',
    nameBm: 'Samosa Kentang',
    descEn: 'Crispy golden pastry triangles stuffed with aromatic spiced potato & peas',
    descBm: 'Samosa kulit garing berinti kentang berempah dan kacang pis',
    price: 4.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/pisang_goreng.jpg'
  },
  {
    id: 'cucur_goreng_pisang',
    nameEn: 'Cucur Goreng Pisang',
    nameBm: 'Cucur Goreng Pisang',
    descEn: 'Traditional sweet banana drop fritters with golden crispy crust',
    descBm: 'Cucur kodok pisang lembut manis beraroma',
    price: 3.50,
    category: 'hi tea',
    image: '/assets/dishes/vector/pisang_goreng.jpg'
  },
  {
    id: 'kuih_muih_campur_petang',
    nameEn: 'Kuih Muih Campur',
    nameBm: 'Kuih Muih Campur',
    descEn: 'Assorted sweet & savory traditional afternoon tea cakes',
    descBm: 'Aneka hidangan kuih-muih tradisional minum petang',
    price: 3.00,
    category: 'hi tea',
    image: '/assets/dishes/vector/kuih_muih.jpg'
  },

  // ==========================================
  // MINUMAN (Drinks)
  // ==========================================
  // Hot/Warm Drinks (Suitable for Sarapan & Minum Petang)
  {
    id: 'milo_panas',
    nameEn: 'Milo',
    nameBm: 'Milo',
    descEn: 'Hot rich and creamy chocolate malt beverage',
    descBm: 'Minuman coklat malt Milo panas berkrim pekat',
    price: 3.50,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/milo_vector.jpg'
  },
  {
    id: 'nescafe_panas',
    nameEn: 'Nescafe',
    nameBm: 'Nescafe',
    descEn: 'Smooth hot Nescafe coffee with sweetened condensed milk',
    descBm: 'Kopi Nescafe panas bancuh susu manis wangi',
    price: 3.50,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/kopi_kampung_vector.jpg'
  },
  {
    id: 'teh_tarik',
    nameEn: 'Teh Tarik',
    nameBm: 'Teh Tarik',
    descEn: 'Traditional frothy pulled milk tea with rich caramel notes',
    descBm: 'Teh tarik buih kaw manis berlemak',
    price: 3.50,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/teh_tarik.jpg'
  },
  {
    id: 'kopi_kampung',
    nameEn: 'Kopi',
    nameBm: 'Kopi',
    descEn: 'Traditional dark roasted village coffee with condensed milk',
    descBm: 'Kopi kampung 434 aroma pekat bersama susu',
    price: 3.50,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/kopi_kampung_vector.jpg'
  },
  {
    id: 'nescafe_o',
    nameEn: 'Nescafe O',
    nameBm: 'Nescafe O',
    descEn: 'Black instant Nescafe coffee with sugar',
    descBm: 'Kopi Nescafe O hitam panas manis pekat',
    price: 3.50,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/kopi_kampung_vector.jpg'
  },
  {
    id: 'milo_o',
    nameEn: 'Milo O',
    nameBm: 'Milo O',
    descEn: 'Hot chocolate malt drink without milk',
    descBm: 'Minuman coklat malt Milo O panas tanpa susu',
    price: 3.50,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/milo_vector.jpg'
  },
  {
    id: 'teh_o',
    nameEn: 'Teh O',
    nameBm: 'Teh O',
    descEn: 'Hot brewed sweet black tea',
    descBm: 'Teh O panas manis segar beraroma',
    price: 3.00,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/teh_tarik.jpg'
  },
  {
    id: 'kopi_o',
    nameEn: 'Kopi O',
    nameBm: 'Kopi O',
    descEn: 'Traditional Malaysian dark roasted black coffee with sugar',
    descBm: 'Kopi O kampung pekat hitam wangi aromatik',
    price: 3.00,
    category: 'drinks',
    suitability: 'breakfast_hitea',
    image: '/assets/drinks/kopi_kampung_vector.jpg'
  },

  // Lunch Cold / Box Drinks
  {
    id: 'sirap_bandung',
    nameEn: 'Sirap Bandung',
    nameBm: 'Sirap Bandung',
    descEn: 'Chilled fragrant rose syrup milk drink',
    descBm: 'Sirap bandung merah manis berkrim ais menyegarkan',
    price: 3.50,
    category: 'drinks',
    suitability: 'lunch',
    image: '/assets/drinks/sirap_bandung.jpg'
  },
  {
    id: 'tetra_pak_peel_fresh_kecil',
    nameEn: 'Tetra Pak Peel Fresh Kecil',
    nameBm: 'Tetra Pak Peel Fresh Kecil',
    descEn: 'Convenient chilled Peel Fresh juice pack',
    descBm: 'Kotak minuman jus buah segar Peel Fresh saiz kecil',
    price: 3.50,
    category: 'drinks',
    suitability: 'lunch',
    image: '/assets/drinks/mineral_water_vector.jpg'
  },
  {
    id: 'air_tetra_pak_berperisa',
    nameEn: 'Air Tetra Pak Berperisa',
    nameBm: 'Air Tetra Pak Berperisa',
    descEn: 'Flavored juice/tea box (Chrysanthemum, Soya, Lychee, Milo)',
    descBm: 'Air kotak Tetra Pak berperisa (Kekwa, Soya, Laici, Milo)',
    price: 3.00,
    category: 'drinks',
    suitability: 'lunch',
    image: '/assets/drinks/mineral_water_vector.jpg'
  },
  {
    id: 'tetra_pak_mineral_water',
    nameEn: 'Tetra Pak Mineral Water',
    nameBm: 'Tetra Pak Mineral Water',
    descEn: 'Eco-friendly paper carton natural drinking water',
    descBm: 'Air mineral semula jadi dalam bungkusan kotak mesra alam',
    price: 3.00,
    category: 'drinks',
    suitability: 'lunch',
    image: '/assets/drinks/mineral_water_vector.jpg'
  },
  {
    id: 'air_kordial',
    nameEn: 'Air Kordial',
    nameBm: 'Air Kordial',
    descEn: 'Refreshing chilled fruit cordial drink (Rose, Mango or Orange)',
    descBm: 'Air kordial sejuk menyegarkan (Ros, Mangga atau Oren)',
    price: 2.50,
    category: 'drinks',
    suitability: 'lunch',
    image: '/assets/drinks/sirap_bandung.jpg'
  },
  {
    id: 'air_mineral_botol',
    nameEn: 'Air Mineral Botol',
    nameBm: 'Air Mineral Botol',
    descEn: 'Clean bottled mineral drinking water',
    descBm: 'Air mineral botol bersih menyegarkan',
    price: 2.50,
    category: 'drinks',
    suitability: 'lunch',
    image: '/assets/drinks/mineral_water_vector.jpg'
  }
];

// Curated featured menu items for landing page showcase
export const MENU_ITEMS: FeaturedMenuItem[] = [
  {
    id: 'asam-pedas',
    nameEn: 'Asam Pedas Ikan Pari',
    nameBm: 'Asam Pedas Ikan Pari',
    descEn: 'Our #1 crowd favorite — spicy tamarind stingray stew with tangy, bold herbal flavors.',
    descBm: 'Kegemaran ramai #1 — rebusan ikan pari asam pedas dengan rasa masam dan berani yang ketara.',
    price: 14.00,
    priceEn: 'From RM 14.00',
    priceBm: 'Daripada RM 14.00',
    image: '/assets/dishes/photos/asam-pedas.jpg',
    category: 'lunch',
    tags: ['spicy', 'fish', 'signature'],
  },
  {
    id: 'nasi-lemak',
    nameEn: 'Nasi Lemak',
    nameBm: 'Nasi Lemak',
    descEn: "Malaysia's national dish — fragrant coconut rice with spicy sambal, crispy anchovies, peanuts, cucumber & boiled egg.",
    descBm: 'Hidangan kebangsaan Malaysia — nasi santan wangi bersama sambal, ikan bilis, kacang, timun & telur rebus.',
    price: 4.50,
    priceEn: 'From RM 4.50',
    priceBm: 'Daripada RM 4.50',
    image: '/assets/dishes/photos/nasi-lemak.jpg',
    category: 'breakfast',
    tags: ['breakfast', 'classic'],
  },
  {
    id: 'lontong-singapore',
    nameEn: 'Lontong Singapore',
    nameBm: 'Lontong Singapore',
    descEn: 'Compressed rice cakes in rich coconut lodeh vegetable curry with cabbage, long beans, tofu and sambal.',
    descBm: 'Nasi himpit di dalam kuah lodeh sayur bersantan pekat bersama kubis, kacang panjang, dan sambal.',
    price: 8.50,
    priceEn: 'From RM 8.50',
    priceBm: 'Daripada RM 8.50',
    image: '/assets/dishes/photos/lontong-singapore.jpg',
    category: 'breakfast',
    tags: ['vegetarian-friendly'],
  },
  {
    id: 'mee-soto',
    nameEn: 'Mee Soto Ayam',
    nameBm: 'Mee Soto Ayam',
    descEn: 'Aromatic spiced chicken noodle soup with shredded chicken, bean sprouts, and crispy fried shallots.',
    descBm: 'Sup mi ayam aromatik bersama carikan isi ayam, taugeh, dan bawang goreng garing.',
    price: 8.00,
    priceEn: 'From RM 8.00',
    priceBm: 'Daripada RM 8.00',
    image: '/assets/dishes/photos/mee-soto.jpg',
    category: 'breakfast',
  },
  {
    id: 'soto-ayam',
    nameEn: 'Soto Ayam Nasi Impit',
    nameBm: 'Soto Ayam Nasi Impit',
    descEn: 'Rich, spiced chicken broth served with compressed rice cubes (nasi impit) and potato croquette (begedil).',
    descBm: 'Sup ayam berempah pekat dihidang bersama nasi himpit dan bergedil kentang.',
    price: 8.50,
    priceEn: 'From RM 8.50',
    priceBm: 'Daripada RM 8.50',
    image: '/assets/dishes/photos/soto-ayam.jpg',
    category: 'breakfast',
  },
  {
    id: 'nasi-campur',
    nameEn: 'Nasi Campur',
    nameBm: 'Nasi Campur',
    descEn: 'White rice paired with your selection of daily freshly cooked Malay dishes, from rendang to fresh greens.',
    descBm: 'Nasi putih berlauk dengan pilihan hidangan segar harian, dari rendang hingga sayur tumis.',
    price: 10.00,
    priceEn: 'From RM 10.00',
    priceBm: 'Daripada RM 10.00',
    image: '/assets/dishes/photos/nasi-campur.jpg',
    category: 'lunch',
    tags: ['daily-special'],
  },
  {
    id: 'teh-tarik',
    nameEn: 'Teh Tarik Kaw',
    nameBm: 'Teh Tarik Kaw',
    descEn: 'Classic Malaysian pulled black tea with sweet condensed milk, frothed to perfection.',
    descBm: 'Teh tarik hitam klasik Malaysia dengan susu pekat manis, berbuih sempurna.',
    price: 2.50,
    priceEn: 'From RM 2.50',
    priceBm: 'Daripada RM 2.50',
    image: '/assets/drinks/teh-tarik.jpg',
    category: 'drinks',
  },
  {
    id: 'kopi-kampung',
    nameEn: 'Kopi 434 Kopi Kampung',
    nameBm: 'Kopi 434 Kopi Kampung',
    descEn: 'Classic rich, dark roasted Malaysian village black coffee, served sweet and aromatic.',
    descBm: 'Kopi kampung hitam panggang klasik Malaysia yang pekat dan harum, dihidangkan manis aromatik.',
    price: 2.80,
    priceEn: 'From RM 2.80',
    priceBm: 'Daripada RM 2.80',
    image: '/assets/drinks/kopi_kampung.jpg',
    category: 'drinks',
  },
];

export const FEATURED_MENU_ITEMS = MENU_ITEMS;


