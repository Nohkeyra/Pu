/**
 * Malaysian Halal food catalog — market reference (Klang Valley / Putrajaya, ~2025–2026).
 * Not the live restaurant menu. Use for admin inspiration, seeding, or price guidance.
 *
 * priceMin / priceMax = typical walk-in plate or unit price (RM).
 * cateringPerPaxHint = rough per-pax when sold as office catering component.
 */
export type CatalogMealSlot = 'breakfast' | 'lunch' | 'hi tea' | 'drinks' | 'any';

export interface HalalCatalogItem {
  id: string;
  nameEn: string;
  nameBm: string;
  descEn: string;
  descBm: string;
  /** Typical low end walk-in (RM) */
  priceMin: number;
  /** Typical high end walk-in (RM) */
  priceMax: number;
  /** Suggested default for app menu (mid of range, rounded) */
  suggestedPrice: number;
  category: CatalogMealSlot;
  group:
    | 'nasi'
    | 'mee'
    | 'roti'
    | 'sup'
    | 'lauk_ayam'
    | 'lauk_daging'
    | 'lauk_ikan'
    | 'lauk_laut'
    | 'sayur'
    | 'rojak'
    | 'kuih'
    | 'minuman'
    | 'set_catering';
  tags?: string[];
}

export const MALAYSIAN_HALAL_CATALOG: HalalCatalogItem[] = [
  // —— Nasi ——
  {
    id: 'cat_nasi_lemak_biasa',
    nameEn: 'Nasi Lemak (Basic)',
    nameBm: 'Nasi Lemak Biasa',
    descEn: 'Coconut rice, sambal, ikan bilis, peanuts, cucumber, egg.',
    descBm: 'Nasi santan, sambal, bilis, kacang, timun, telur.',
    priceMin: 3.5, priceMax: 5, suggestedPrice: 4, category: 'breakfast', group: 'nasi', tags: ['national', 'classic'],
  },
  {
    id: 'cat_nasi_lemak_ayam',
    nameEn: 'Nasi Lemak with Fried Chicken',
    nameBm: 'Nasi Lemak Ayam Goreng',
    descEn: 'Nasi lemak with spiced fried chicken.',
    descBm: 'Nasi lemak bersama ayam goreng berempah.',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'breakfast', group: 'nasi',
  },
  {
    id: 'cat_nasi_lemak_sotong',
    nameEn: 'Nasi Lemak with Sambal Squid',
    nameBm: 'Nasi Lemak Sambal Sotong',
    descEn: 'Nasi lemak topped with sambal sotong.',
    descBm: 'Nasi lemak dengan sambal sotong.',
    priceMin: 8, priceMax: 14, suggestedPrice: 10, category: 'breakfast', group: 'nasi',
  },
  {
    id: 'cat_nasi_goreng_kampung',
    nameEn: 'Nasi Goreng Kampung',
    nameBm: 'Nasi Goreng Kampung',
    descEn: 'Village-style fried rice with anchovies, vegetables, chilli.',
    descBm: 'Nasi goreng kampung dengan bilis, sayur dan cili.',
    priceMin: 6, priceMax: 11, suggestedPrice: 8, category: 'lunch', group: 'nasi',
  },
  {
    id: 'cat_nasi_goreng_cina',
    nameEn: 'Nasi Goreng Cina',
    nameBm: 'Nasi Goreng Cina',
    descEn: 'Chinese-style fried rice, lighter seasoning.',
    descBm: 'Nasi goreng gaya Cina, perasa lebih ringan.',
    priceMin: 6, priceMax: 10, suggestedPrice: 7.5, category: 'lunch', group: 'nasi',
  },
  {
    id: 'cat_nasi_goreng_pattaya',
    nameEn: 'Nasi Goreng Pattaya',
    nameBm: 'Nasi Goreng Pattaya',
    descEn: 'Fried rice wrapped in thin omelette.',
    descBm: 'Nasi goreng dibungkus telur dadar nipis.',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'nasi',
  },
  {
    id: 'cat_nasi_campur',
    nameEn: 'Nasi Campur / Economy Rice',
    nameBm: 'Nasi Campur',
    descEn: 'White rice with choice of daily lauk (price varies by selection).',
    descBm: 'Nasi putih dengan pilihan lauk harian (harga mengikut lauk).',
    priceMin: 6, priceMax: 15, suggestedPrice: 10, category: 'lunch', group: 'nasi', tags: ['variable'],
  },
  {
    id: 'cat_nasi_briyani',
    nameEn: 'Nasi Briyani',
    nameBm: 'Nasi Briyani',
    descEn: 'Fragrant spiced rice, often with chicken or mutton.',
    descBm: 'Nasi berempah wangi, biasanya dengan ayam atau kambing.',
    priceMin: 10, priceMax: 18, suggestedPrice: 14, category: 'lunch', group: 'nasi',
  },
  {
    id: 'cat_nasi_minyak',
    nameEn: 'Nasi Minyak',
    nameBm: 'Nasi Minyak',
    descEn: 'Ghee-scented rice for kenduri / catering sets.',
    descBm: 'Nasi berbau minyak samin untuk kenduri / set katering.',
    priceMin: 3, priceMax: 6, suggestedPrice: 4, category: 'lunch', group: 'nasi', tags: ['catering'],
  },
  {
    id: 'cat_nasi_tomato',
    nameEn: 'Nasi Tomato',
    nameBm: 'Nasi Tomato',
    descEn: 'Tomato rice, popular in catering packages.',
    descBm: 'Nasi tomato, popular dalam pakej katering.',
    priceMin: 3, priceMax: 6, suggestedPrice: 4.5, category: 'lunch', group: 'nasi', tags: ['catering'],
  },
  {
    id: 'cat_lontong',
    nameEn: 'Lontong / Lontong Singapore',
    nameBm: 'Lontong Singapore',
    descEn: 'Compressed rice cakes in coconut vegetable gravy (lodeh).',
    descBm: 'Nasi himpit dalam kuah lodeh bersantan.',
    priceMin: 6, priceMax: 10, suggestedPrice: 8, category: 'breakfast', group: 'nasi',
  },
  {
    id: 'cat_nasi_kerabu',
    nameEn: 'Nasi Kerabu',
    nameBm: 'Nasi Kerabu',
    descEn: 'Blue/herb rice with kerabu, sambal, and protein.',
    descBm: 'Nasi biru/herba dengan kerabu, sambal dan lauk.',
    priceMin: 8, priceMax: 15, suggestedPrice: 11, category: 'lunch', group: 'nasi', tags: ['east-coast'],
  },

  // —— Mee / noodles ——
  {
    id: 'cat_mee_goreng_mamak',
    nameEn: 'Mee Goreng Mamak',
    nameBm: 'Mee Goreng Mamak',
    descEn: 'Wok-fried yellow noodles, mamak style.',
    descBm: 'Mee kuning goreng gaya mamak.',
    priceMin: 6, priceMax: 9, suggestedPrice: 7, category: 'breakfast', group: 'mee',
  },
  {
    id: 'cat_maggi_goreng',
    nameEn: 'Maggi Goreng',
    nameBm: 'Maggi Goreng',
    descEn: 'Stir-fried instant noodles mamak style.',
    descBm: 'Maggi goreng gaya mamak.',
    priceMin: 5, priceMax: 8, suggestedPrice: 6.5, category: 'breakfast', group: 'mee',
  },
  {
    id: 'cat_mee_rebus',
    nameEn: 'Mee Rebus',
    nameBm: 'Mee Rebus',
    descEn: 'Yellow noodles in thick sweet-spicy gravy.',
    descBm: 'Mee dalam kuah pekat manis-pedas.',
    priceMin: 6, priceMax: 10, suggestedPrice: 7.5, category: 'lunch', group: 'mee', tags: ['signature-friendly'],
  },
  {
    id: 'cat_mee_siam',
    nameEn: 'Mee Siam',
    nameBm: 'Mee Siam',
    descEn: 'Rice vermicelli in tangy-spicy gravy or fried.',
    descBm: 'Bihun dalam kuah masam-pedas atau goreng.',
    priceMin: 6, priceMax: 10, suggestedPrice: 7.5, category: 'lunch', group: 'mee',
  },
  {
    id: 'cat_mee_kari',
    nameEn: 'Mee Kari',
    nameBm: 'Mee Kari',
    descEn: 'Noodles in coconut curry broth.',
    descBm: 'Mee dalam kuah kari bersantan.',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'mee',
  },
  {
    id: 'cat_bihun_goreng',
    nameEn: 'Bihun Goreng',
    nameBm: 'Bihun Goreng',
    descEn: 'Fried rice vermicelli.',
    descBm: 'Bihun goreng.',
    priceMin: 5.5, priceMax: 9, suggestedPrice: 7, category: 'breakfast', group: 'mee',
  },
  {
    id: 'cat_kuey_teow_goreng',
    nameEn: 'Kuey Teow Goreng',
    nameBm: 'Kuey Teow Goreng',
    descEn: 'Fried flat rice noodles.',
    descBm: 'Kuey teow goreng.',
    priceMin: 6, priceMax: 11, suggestedPrice: 8, category: 'lunch', group: 'mee',
  },
  {
    id: 'cat_char_kuey_teow',
    nameEn: 'Char Kuey Teow',
    nameBm: 'Char Kuey Teow',
    descEn: 'Wok-hei flat noodles (halal version without lard).',
    descBm: 'Kuey teow goreng kuali (versi halal tanpa lemak babi).',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'mee', tags: ['halal-version'],
  },
  {
    id: 'cat_laksa_penang',
    nameEn: 'Asam Laksa (Penang-style)',
    nameBm: 'Asam Laksa',
    descEn: 'Sour fish-based noodle soup.',
    descBm: 'Mee kuah asam ikan.',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'mee',
  },
  {
    id: 'cat_laksa_johor',
    nameEn: 'Laksa Johor',
    nameBm: 'Laksa Johor',
    descEn: 'Spaghetti-style noodles with thick fish gravy.',
    descBm: 'Mi spaghetti dengan kuah ikan pekat.',
    priceMin: 8, priceMax: 14, suggestedPrice: 10, category: 'lunch', group: 'mee',
  },
  {
    id: 'cat_mee_soto',
    nameEn: 'Mee Soto',
    nameBm: 'Mee Soto',
    descEn: 'Noodles in clear spiced chicken soup.',
    descBm: 'Mee dalam sup ayam berempah.',
    priceMin: 6, priceMax: 11, suggestedPrice: 8, category: 'lunch', group: 'mee',
  },

  // —— Roti / breakfast breads ——
  {
    id: 'cat_roti_canai',
    nameEn: 'Roti Canai (Plain)',
    nameBm: 'Roti Canai Kosong',
    descEn: 'Flaky flatbread with dhal or curry.',
    descBm: 'Roti canai dengan dhal atau kari.',
    priceMin: 1.5, priceMax: 2.5, suggestedPrice: 2, category: 'breakfast', group: 'roti',
  },
  {
    id: 'cat_roti_telur',
    nameEn: 'Roti Telur',
    nameBm: 'Roti Telur',
    descEn: 'Roti canai with egg.',
    descBm: 'Roti canai bergaul telur.',
    priceMin: 2.7, priceMax: 3.5, suggestedPrice: 3, category: 'breakfast', group: 'roti',
  },
  {
    id: 'cat_roti_boom',
    nameEn: 'Roti Boom',
    nameBm: 'Roti Boom',
    descEn: 'Thicker layered roti.',
    descBm: 'Roti berlapis lebih tebal.',
    priceMin: 2.5, priceMax: 4, suggestedPrice: 3, category: 'breakfast', group: 'roti',
  },
  {
    id: 'cat_roti_sardin',
    nameEn: 'Roti Sardin',
    nameBm: 'Roti Sardin',
    descEn: 'Roti with sardine filling.',
    descBm: 'Roti dengan inti sardin.',
    priceMin: 3, priceMax: 5, suggestedPrice: 4, category: 'breakfast', group: 'roti',
  },
  {
    id: 'cat_tosai',
    nameEn: 'Tosai / Thosai',
    nameBm: 'Tosai',
    descEn: 'Fermented rice-lentil crepe with chutney/dhal.',
    descBm: 'Crepe beras-dal dengan chutney/dhal.',
    priceMin: 2, priceMax: 4, suggestedPrice: 2.5, category: 'breakfast', group: 'roti',
  },

  // —— Soup ——
  {
    id: 'cat_soto_ayam',
    nameEn: 'Soto Ayam',
    nameBm: 'Soto Ayam',
    descEn: 'Spiced chicken soup with rice cakes / noodles.',
    descBm: 'Sup ayam berempah dengan nasi himpit / mee.',
    priceMin: 6, priceMax: 12, suggestedPrice: 8, category: 'lunch', group: 'sup',
  },
  {
    id: 'cat_sup_tulang',
    nameEn: 'Sup Tulang',
    nameBm: 'Sup Tulang',
    descEn: 'Beef bone soup.',
    descBm: 'Sup tulang lembu.',
    priceMin: 8, priceMax: 15, suggestedPrice: 11, category: 'lunch', group: 'sup',
  },
  {
    id: 'cat_sup_ekor',
    nameEn: 'Sup Ekor',
    nameBm: 'Sup Ekor',
    descEn: 'Oxtail soup.',
    descBm: 'Sup ekor lembu.',
    priceMin: 12, priceMax: 20, suggestedPrice: 15, category: 'lunch', group: 'sup',
  },
  {
    id: 'cat_bubur_ayam',
    nameEn: 'Bubur Ayam',
    nameBm: 'Bubur Ayam',
    descEn: 'Chicken rice porridge.',
    descBm: 'Bubur nasi ayam.',
    priceMin: 5, priceMax: 8, suggestedPrice: 6, category: 'breakfast', group: 'sup',
  },

  // —— Lauk ayam ——
  {
    id: 'cat_ayam_goreng_berempah',
    nameEn: 'Ayam Goreng Berempah',
    nameBm: 'Ayam Goreng Berempah',
    descEn: 'Spiced fried chicken.',
    descBm: 'Ayam goreng berempah.',
    priceMin: 6, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'lauk_ayam',
  },
  {
    id: 'cat_ayam_masak_merah',
    nameEn: 'Ayam Masak Merah',
    nameBm: 'Ayam Masak Merah',
    descEn: 'Chicken in sweet-savoury red tomato gravy.',
    descBm: 'Ayam dalam kuah tomato manis-sedap.',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'lauk_ayam', tags: ['catering'],
  },
  {
    id: 'cat_ayam_kurma',
    nameEn: 'Ayam Kurma',
    nameBm: 'Ayam Kurma',
    descEn: 'Mild creamy kurma curry chicken.',
    descBm: 'Ayam kurma lembut.',
    priceMin: 7, priceMax: 13, suggestedPrice: 10, category: 'lunch', group: 'lauk_ayam',
  },
  {
    id: 'cat_ayam_rendang',
    nameEn: 'Rendang Ayam',
    nameBm: 'Rendang Ayam',
    descEn: 'Dry coconut spice chicken rendang.',
    descBm: 'Rendang ayam kering berempah.',
    priceMin: 8, priceMax: 14, suggestedPrice: 10, category: 'lunch', group: 'lauk_ayam',
  },
  {
    id: 'cat_ayam_kicap',
    nameEn: 'Ayam Masak Kicap',
    nameBm: 'Ayam Masak Kicap',
    descEn: 'Soy sauce braised chicken.',
    descBm: 'Ayam masak kicap.',
    priceMin: 7, priceMax: 12, suggestedPrice: 9, category: 'lunch', group: 'lauk_ayam',
  },
  {
    id: 'cat_ayam_paprik',
    nameEn: 'Ayam Paprik',
    nameBm: 'Ayam Paprik',
    descEn: 'Chicken stir-fried with paprika-style sauce and veg.',
    descBm: 'Ayam goreng kuali sos paprik dan sayur.',
    priceMin: 8, priceMax: 14, suggestedPrice: 10, category: 'lunch', group: 'lauk_ayam',
  },

  // —— Lauk daging ——
  {
    id: 'cat_rendang_daging',
    nameEn: 'Rendang Daging',
    nameBm: 'Rendang Daging',
    descEn: 'Slow-cooked beef rendang.',
    descBm: 'Rendang daging dimasak lama.',
    priceMin: 10, priceMax: 18, suggestedPrice: 14, category: 'lunch', group: 'lauk_daging',
  },
  {
    id: 'cat_daging_masak_hitam',
    nameEn: 'Daging Masak Hitam',
    nameBm: 'Daging Masak Hitam',
    descEn: 'Dark soy braised beef.',
    descBm: 'Daging masak kicap hitam.',
    priceMin: 9, priceMax: 16, suggestedPrice: 12, category: 'lunch', group: 'lauk_daging',
  },
  {
    id: 'cat_daging_masak_merah',
    nameEn: 'Daging Masak Merah',
    nameBm: 'Daging Masak Merah',
    descEn: 'Beef in red sweet gravy.',
    descBm: 'Daging dalam kuah merah.',
    priceMin: 9, priceMax: 16, suggestedPrice: 12, category: 'lunch', group: 'lauk_daging',
  },
  {
    id: 'cat_kari_kambing',
    nameEn: 'Kari Kambing',
    nameBm: 'Kari Kambing',
    descEn: 'Mutton curry.',
    descBm: 'Kari kambing.',
    priceMin: 12, priceMax: 20, suggestedPrice: 15, category: 'lunch', group: 'lauk_daging',
  },
  {
    id: 'cat_dendeng',
    nameEn: 'Dendeng',
    nameBm: 'Dendeng',
    descEn: 'Thin spiced dried-style beef.',
    descBm: 'Daging pipih berempah gaya dendeng.',
    priceMin: 10, priceMax: 18, suggestedPrice: 14, category: 'lunch', group: 'lauk_daging',
  },

  // —— Fish ——
  {
    id: 'cat_asam_pedas_ikan',
    nameEn: 'Asam Pedas Ikan',
    nameBm: 'Asam Pedas Ikan',
    descEn: 'Fish in sour-spicy herbal gravy.',
    descBm: 'Ikan dalam kuah asam pedas.',
    priceMin: 8, priceMax: 15, suggestedPrice: 11, category: 'lunch', group: 'lauk_ikan', tags: ['classic'],
  },
  {
    id: 'cat_ikan_goreng_sambal',
    nameEn: 'Ikan Goreng Sambal',
    nameBm: 'Ikan Goreng Berlada / Sambal',
    descEn: 'Fried fish with chilli sambal.',
    descBm: 'Ikan goreng dengan sambal cili.',
    priceMin: 7, priceMax: 14, suggestedPrice: 10, category: 'lunch', group: 'lauk_ikan',
  },
  {
    id: 'cat_ikan_keli_sambal',
    nameEn: 'Ikan Keli Sambal',
    nameBm: 'Ikan Keli Sambal',
    descEn: 'Catfish with sambal.',
    descBm: 'Ikan keli bersambal.',
    priceMin: 8, priceMax: 14, suggestedPrice: 11, category: 'lunch', group: 'lauk_ikan',
  },
  {
    id: 'cat_ikan_bakar',
    nameEn: 'Ikan Bakar',
    nameBm: 'Ikan Bakar',
    descEn: 'Grilled fish with sambal.',
    descBm: 'Ikan bakar bersambal.',
    priceMin: 10, priceMax: 25, suggestedPrice: 15, category: 'lunch', group: 'lauk_ikan', tags: ['variable-size'],
  },
  {
    id: 'cat_masak_lemak_cili_api',
    nameEn: 'Masak Lemak Cili Api',
    nameBm: 'Masak Lemak Cili Api',
    descEn: 'Coconut milk dish with bird’s eye chilli (fish or veg).',
    descBm: 'Masakan santan cili api (ikan atau sayur).',
    priceMin: 7, priceMax: 14, suggestedPrice: 10, category: 'lunch', group: 'lauk_ikan',
  },

  // —— Seafood ——
  {
    id: 'cat_sambal_sotong',
    nameEn: 'Sambal Sotong',
    nameBm: 'Sambal Sotong',
    descEn: 'Squid in sambal (sometimes with petai).',
    descBm: 'Sotong sambal (kadang dengan petai).',
    priceMin: 10, priceMax: 16, suggestedPrice: 13, category: 'lunch', group: 'lauk_laut',
  },
  {
    id: 'cat_udang_goreng',
    nameEn: 'Udang Goreng Tepung / Berlada',
    nameBm: 'Udang Goreng',
    descEn: 'Fried or chilli prawns.',
    descBm: 'Udang goreng tepung atau berlada.',
    priceMin: 12, priceMax: 20, suggestedPrice: 15, category: 'lunch', group: 'lauk_laut',
  },
  {
    id: 'cat_sambal_udang',
    nameEn: 'Sambal Udang',
    nameBm: 'Sambal Udang',
    descEn: 'Prawns in chilli sambal.',
    descBm: 'Udang dimasak sambal.',
    priceMin: 12, priceMax: 20, suggestedPrice: 15, category: 'lunch', group: 'lauk_laut',
  },

  // —— Vegetables ——
  {
    id: 'cat_kangkung_belacan',
    nameEn: 'Kangkung Goreng Belacan',
    nameBm: 'Kangkung Goreng Belacan',
    descEn: 'Water spinach stir-fried with shrimp paste.',
    descBm: 'Kangkung tumis belacan.',
    priceMin: 4, priceMax: 7, suggestedPrice: 5, category: 'lunch', group: 'sayur',
  },
  {
    id: 'cat_sayur_campur',
    nameEn: 'Sayur Campur',
    nameBm: 'Sayur Campur',
    descEn: 'Mixed stir-fried vegetables.',
    descBm: 'Sayur campur tumis.',
    priceMin: 3, priceMax: 6, suggestedPrice: 4.5, category: 'lunch', group: 'sayur',
  },
  {
    id: 'cat_acar',
    nameEn: 'Acar',
    nameBm: 'Acar Timun / Acar Buah',
    descEn: 'Pickled cucumber or mixed vegetable pickle.',
    descBm: 'Acar timun atau acar buah.',
    priceMin: 2, priceMax: 5, suggestedPrice: 3, category: 'lunch', group: 'sayur', tags: ['catering'],
  },
  {
    id: 'cat_taugeh_goreng',
    nameEn: 'Taugeh Goreng',
    nameBm: 'Taugeh Goreng',
    descEn: 'Stir-fried bean sprouts.',
    descBm: 'Taugeh tumis.',
    priceMin: 3, priceMax: 5, suggestedPrice: 4, category: 'lunch', group: 'sayur',
  },
  {
    id: 'cat_telur_dadar',
    nameEn: 'Telur Dadar',
    nameBm: 'Telur Dadar',
    descEn: 'Omelette.',
    descBm: 'Telur dadar.',
    priceMin: 1.5, priceMax: 3, suggestedPrice: 2, category: 'lunch', group: 'sayur',
  },
  {
    id: 'cat_telur_mata',
    nameEn: 'Telur Mata',
    nameBm: 'Telur Mata Sapi',
    descEn: 'Fried sunny-side-up egg.',
    descBm: 'Telur mata.',
    priceMin: 1.5, priceMax: 3, suggestedPrice: 2, category: 'lunch', group: 'sayur',
  },
  {
    id: 'cat_bergedil',
    nameEn: 'Bergedil',
    nameBm: 'Bergedil',
    descEn: 'Potato croquettes.',
    descBm: 'Bergedil kentang.',
    priceMin: 1, priceMax: 2.5, suggestedPrice: 1.5, category: 'lunch', group: 'sayur',
  },

  // —— Rojak / salads ——
  {
    id: 'cat_rojak_singapore',
    nameEn: 'Rojak Singapore',
    nameBm: 'Rojak Singapore',
    descEn: 'Mixed fritters and veg with thick sweet-spicy sauce.',
    descBm: 'Campuran goreng dan sayur dengan kuah pekat manis-pedas.',
    priceMin: 5, priceMax: 10, suggestedPrice: 7, category: 'hi tea', group: 'rojak', tags: ['signature-friendly'],
  },
  {
    id: 'cat_rojak_buah',
    nameEn: 'Rojak Buah',
    nameBm: 'Rojak Buah',
    descEn: 'Fruit rojak with shrimp paste sauce.',
    descBm: 'Rojak buah dengan kuah shrimp paste.',
    priceMin: 5, priceMax: 9, suggestedPrice: 6.5, category: 'hi tea', group: 'rojak',
  },
  {
    id: 'cat_pasembur',
    nameEn: 'Pasembur',
    nameBm: 'Pasembur',
    descEn: 'Northern-style mixed salad with thick sauce.',
    descBm: 'Salad campur gaya utara dengan kuah pekat.',
    priceMin: 6, priceMax: 11, suggestedPrice: 8, category: 'hi tea', group: 'rojak',
  },
  {
    id: 'cat_kerabu',
    nameEn: 'Kerabu',
    nameBm: 'Kerabu (Manggo / Maggi / etc.)',
    descEn: 'Spicy herb salad variations.',
    descBm: 'Kerabu pelbagai (mangga, maggi, dll).',
    priceMin: 4, priceMax: 10, suggestedPrice: 6, category: 'lunch', group: 'rojak',
  },

  // —— Kuih / hi-tea ——
  {
    id: 'cat_kuih_campur',
    nameEn: 'Kuih-Muih Campur',
    nameBm: 'Kuih-Muih Campur',
    descEn: 'Assorted Malay kuih (per piece or set).',
    descBm: 'Kuih Melayu campur (sebingkis atau set).',
    priceMin: 1, priceMax: 3, suggestedPrice: 1.5, category: 'hi tea', group: 'kuih', tags: ['per-piece'],
  },
  {
    id: 'cat_karipap',
    nameEn: 'Karipap',
    nameBm: 'Karipap',
    descEn: 'Curry puff.',
    descBm: 'Karipap.',
    priceMin: 1, priceMax: 2.5, suggestedPrice: 1.5, category: 'hi tea', group: 'kuih',
  },
  {
    id: 'cat_cucur',
    nameEn: 'Cucur / Goreng Pisang',
    nameBm: 'Cucur / Goreng Pisang',
    descEn: 'Fried banana or mixed fritters.',
    descBm: 'Goreng pisang atau cucur campur.',
    priceMin: 1, priceMax: 3, suggestedPrice: 2, category: 'hi tea', group: 'kuih',
  },
  {
    id: 'cat_popia',
    nameEn: 'Popia Basah / Goreng',
    nameBm: 'Popia',
    descEn: 'Fresh or fried spring rolls.',
    descBm: 'Popia basah atau goreng.',
    priceMin: 2, priceMax: 5, suggestedPrice: 3, category: 'hi tea', group: 'kuih',
  },
  {
    id: 'cat_satay_ayam',
    nameEn: 'Satay Ayam (per stick)',
    nameBm: 'Satay Ayam (sebatang)',
    descEn: 'Grilled chicken satay with peanut sauce.',
    descBm: 'Satay ayam bakar dengan kuah kacang.',
    priceMin: 1, priceMax: 1.5, suggestedPrice: 1.2, category: 'hi tea', group: 'kuih', tags: ['per-stick'],
  },

  // —— Drinks ——
  {
    id: 'cat_teh_tarik',
    nameEn: 'Teh Tarik',
    nameBm: 'Teh Tarik',
    descEn: 'Pulled milk tea.',
    descBm: 'Teh susu ditarik.',
    priceMin: 2, priceMax: 3, suggestedPrice: 2.5, category: 'drinks', group: 'minuman', tags: ['signature-friendly'],
  },
  {
    id: 'cat_teh_o_ais',
    nameEn: 'Teh O Ais',
    nameBm: 'Teh O Ais',
    descEn: 'Iced black tea.',
    descBm: 'Teh o sejuk.',
    priceMin: 1.8, priceMax: 3, suggestedPrice: 2.2, category: 'drinks', group: 'minuman',
  },
  {
    id: 'cat_teh_limau',
    nameEn: 'Teh Limau Ais',
    nameBm: 'Teh Limau Ais',
    descEn: 'Iced tea with lime.',
    descBm: 'Teh limau sejuk.',
    priceMin: 2, priceMax: 3.5, suggestedPrice: 2.5, category: 'drinks', group: 'minuman',
  },
  {
    id: 'cat_kopi_tarik',
    nameEn: 'Kopi / Kopi Tarik',
    nameBm: 'Kopi',
    descEn: 'Local coffee with milk.',
    descBm: 'Kopi susu tempatan.',
    priceMin: 2, priceMax: 3, suggestedPrice: 2.3, category: 'drinks', group: 'minuman',
  },
  {
    id: 'cat_milo',
    nameEn: 'Milo (Hot / Ice)',
    nameBm: 'Milo',
    descEn: 'Chocolate malt drink.',
    descBm: 'Minuman coklat malt.',
    priceMin: 2.2, priceMax: 3.5, suggestedPrice: 2.8, category: 'drinks', group: 'minuman',
  },
  {
    id: 'cat_sirap_bandung',
    nameEn: 'Sirap Bandung',
    nameBm: 'Sirap Bandung',
    descEn: 'Rose syrup with milk.',
    descBm: 'Sirap ros dengan susu.',
    priceMin: 2, priceMax: 3.5, suggestedPrice: 2.5, category: 'drinks', group: 'minuman',
  },
  {
    id: 'cat_air_mineral',
    nameEn: 'Air Mineral',
    nameBm: 'Air Mineral',
    descEn: 'Bottled mineral water.',
    descBm: 'Air mineral botol.',
    priceMin: 1, priceMax: 2, suggestedPrice: 1.5, category: 'drinks', group: 'minuman',
  },
  {
    id: 'cat_air_kordial',
    nameEn: 'Air Kordial',
    nameBm: 'Air Kordial',
    descEn: 'Cordial squash drink.',
    descBm: 'Minuman kordial.',
    priceMin: 1.5, priceMax: 2.5, suggestedPrice: 2, category: 'drinks', group: 'minuman',
  },
];

/** Rough catering package bands (per pax, Klang Valley / Putrajaya). */
export const CATERING_PACKAGE_BANDS = [
  {
    id: 'economy_box',
    nameEn: 'Economy packed meal',
    nameBm: 'Set kotak ekonomi',
    perPaxMin: 7,
    perPaxMax: 12,
    includesEn: 'Rice + 1 protein + 1 vegetable',
    includesBm: 'Nasi + 1 lauk + 1 sayur',
  },
  {
    id: 'standard_office',
    nameEn: 'Standard office lunch',
    nameBm: 'Makan tengahari pejabat standard',
    perPaxMin: 12,
    perPaxMax: 20,
    includesEn: 'Rice + 2–3 dishes + optional drink',
    includesBm: 'Nasi + 2–3 lauk + minuman pilihan',
  },
  {
    id: 'buffet_basic',
    nameEn: 'Basic buffet',
    nameBm: 'Buffet asas',
    perPaxMin: 18,
    perPaxMax: 35,
    includesEn: '4–6 dishes, rice, basic setup',
    includesBm: '4–6 lauk, nasi, setup asas',
  },
  {
    id: 'buffet_mid',
    nameEn: 'Mid-range buffet',
    nameBm: 'Buffet pertengahan',
    perPaxMin: 30,
    perPaxMax: 50,
    includesEn: 'Better proteins, dessert or fruit',
    includesBm: 'Protein lebih baik, pencuci mulut atau buah',
  },
  {
    id: 'tea_break',
    nameEn: 'Tea break / kuih set',
    nameBm: 'Tea break / set kuih',
    perPaxMin: 8,
    perPaxMax: 15,
    includesEn: 'Kuih + drinks',
    includesBm: 'Kuih + minuman',
  },
] as const;

/** Convert catalog row → shape compatible with constants/menu MenuItem */
export function catalogToMenuItem(item: HalalCatalogItem) {
  return {
    id: item.id,
    nameEn: item.nameEn,
    nameBm: item.nameBm,
    descEn: `${item.descEn} (Market guide RM${item.priceMin}–${item.priceMax})`,
    descBm: `${item.descBm} (Panduan pasaran RM${item.priceMin}–${item.priceMax})`,
    price: item.suggestedPrice,
    category: item.category === 'any' ? 'lunch' : item.category,
    available: true,
  };
}

export function getCatalogByGroup(group: HalalCatalogItem['group']) {
  return MALAYSIAN_HALAL_CATALOG.filter((i) => i.group === group);
}

export function getCatalogByCategory(category: CatalogMealSlot) {
  return MALAYSIAN_HALAL_CATALOG.filter((i) => i.category === category || i.category === 'any');
}
