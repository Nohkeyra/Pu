// Canonical menu cutouts and only the known legacy defaults they replace.
// Names and IDs are checked before saved images are upgraded; custom images stay intact.
interface MenuImageEntry {
  nameBm: string;
  image: string;
  ids: readonly string[];
  legacyImages: readonly string[];
}

const entries: readonly MenuImageEntry[] = [
  {
    "nameBm": "Nasi Lemak Sambal Sotong",
    "image": "/assets/dishes/cutouts/nasi_lemak_sambal_sotong.webp",
    "ids": [
      "nasi_lemak_sambal_sotong"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_lemak.jpg",
      "/assets/dishes/vector/nasi_lemak_sotong.jpg",
      "/assets/dishes/vector/nasi_lemak_sotong.png",
      "/assets/dishes/vector/nasi_lemak_sotong.webp"
    ]
  },
  {
    "nameBm": "Laksa Johor",
    "image": "/assets/dishes/cutouts/laksa_johor.webp",
    "ids": [
      "laksa_johor_sarapan",
      "laksa_johor_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/laksa_johor.jpg",
      "/assets/dishes/vector/laksa_johor.png",
      "/assets/dishes/vector/laksa_johor.webp"
    ]
  },
  {
    "nameBm": "Asam Laksa",
    "image": "/assets/dishes/cutouts/asam_laksa.webp",
    "ids": [
      "asam_laksa_sarapan",
      "asam_laksa_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/asam_laksa.jpg",
      "/assets/dishes/vector/asam_laksa.png",
      "/assets/dishes/vector/asam_laksa.webp"
    ]
  },
  {
    "nameBm": "Mee Kari",
    "image": "/assets/dishes/cutouts/mee_kari.webp",
    "ids": [
      "mee_kari_sarapan",
      "mee_kari_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/mee_kari.jpg",
      "/assets/dishes/vector/mee_kari.png",
      "/assets/dishes/vector/mee_kari.webp"
    ]
  },
  {
    "nameBm": "Lontong Singapore",
    "image": "/assets/dishes/cutouts/lontong_singapore.webp",
    "ids": [
      "lontong_singapore"
    ],
    "legacyImages": [
      "/assets/dishes/vector/lontong.jpg",
      "/assets/dishes/vector/lontong.png",
      "/assets/dishes/vector/lontong.webp"
    ]
  },
  {
    "nameBm": "Soto Ayam",
    "image": "/assets/dishes/cutouts/soto_ayam.webp",
    "ids": [
      "soto_ayam_sarapan",
      "soto_ayam_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/soto_ayam.jpg",
      "/assets/dishes/vector/soto_ayam.png",
      "/assets/dishes/vector/soto_ayam.webp"
    ]
  },
  {
    "nameBm": "Mee Soto",
    "image": "/assets/dishes/cutouts/mee_soto.webp",
    "ids": [
      "mee_soto_sarapan",
      "mee_soto_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/mee_soto.jpg",
      "/assets/dishes/vector/mee_soto.png",
      "/assets/dishes/vector/mee_soto.webp",
      "/assets/dishes/vector/soto_ayam.jpg"
    ]
  },
  {
    "nameBm": "Nasi Lemak Ayam Goreng",
    "image": "/assets/dishes/cutouts/nasi_lemak_ayam_goreng.webp",
    "ids": [
      "nasi_lemak_ayam_goreng"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_lemak.jpg",
      "/assets/dishes/vector/nasi_lemak_ayam.jpg",
      "/assets/dishes/vector/nasi_lemak_ayam.png",
      "/assets/dishes/vector/nasi_lemak_ayam.webp"
    ]
  },
  {
    "nameBm": "Mee Siam",
    "image": "/assets/dishes/cutouts/mee_siam.webp",
    "ids": [
      "mee_siam_sarapan",
      "mee_siam_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/bihun_goreng.jpg",
      "/assets/dishes/vector/laksa_johor.jpg",
      "/assets/dishes/vector/mee_siam.jpg",
      "/assets/dishes/vector/mee_siam.png",
      "/assets/dishes/vector/mee_siam.webp"
    ]
  },
  {
    "nameBm": "Mee Rebus",
    "image": "/assets/dishes/cutouts/mee_rebus.webp",
    "ids": [
      "mee_rebus_sarapan",
      "mee_rebus_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/mee_kari.jpg",
      "/assets/dishes/vector/mee_rebus.jpg",
      "/assets/dishes/vector/mee_rebus.png",
      "/assets/dishes/vector/mee_rebus.webp"
    ]
  },
  {
    "nameBm": "Bihun Goreng",
    "image": "/assets/dishes/cutouts/bihun_goreng.webp",
    "ids": [
      "bihun_goreng"
    ],
    "legacyImages": [
      "/assets/dishes/vector/bihun_goreng.jpg",
      "/assets/dishes/vector/bihun_goreng.png",
      "/assets/dishes/vector/bihun_goreng.webp"
    ]
  },
  {
    "nameBm": "Maggi Goreng",
    "image": "/assets/dishes/cutouts/maggi_goreng.webp",
    "ids": [
      "maggi_goreng"
    ],
    "legacyImages": [
      "/assets/dishes/vector/maggi_goreng.jpg",
      "/assets/dishes/vector/maggi_goreng.png",
      "/assets/dishes/vector/maggi_goreng.webp",
      "/assets/dishes/vector/mee_goreng.jpg"
    ]
  },
  {
    "nameBm": "Bubur Ayam",
    "image": "/assets/dishes/cutouts/bubur_ayam.webp",
    "ids": [
      "bubur_ayam"
    ],
    "legacyImages": [
      "/assets/dishes/vector/bubur_ayam.jpg",
      "/assets/dishes/vector/bubur_ayam.png",
      "/assets/dishes/vector/bubur_ayam.webp",
      "/assets/dishes/vector/soto_ayam.jpg"
    ]
  },
  {
    "nameBm": "Mee Goreng Mamak",
    "image": "/assets/dishes/cutouts/mee_goreng_mamak.webp",
    "ids": [
      "mee_goreng_mamak"
    ],
    "legacyImages": [
      "/assets/dishes/vector/mee_goreng.jpg",
      "/assets/dishes/vector/mee_goreng.png",
      "/assets/dishes/vector/mee_goreng.webp"
    ]
  },
  {
    "nameBm": "Roti Sardin",
    "image": "/assets/dishes/cutouts/roti_sardin.webp",
    "ids": [
      "roti_sardin"
    ],
    "legacyImages": [
      "/assets/dishes/vector/roti_canai.jpg",
      "/assets/dishes/vector/roti_sardin.jpg",
      "/assets/dishes/vector/roti_sardin.png",
      "/assets/dishes/vector/roti_sardin.webp"
    ]
  },
  {
    "nameBm": "Nasi Lemak Biasa",
    "image": "/assets/dishes/cutouts/nasi_lemak_biasa.webp",
    "ids": [
      "nasi_lemak_biasa"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_lemak.jpg",
      "/assets/dishes/vector/nasi_lemak.png",
      "/assets/dishes/vector/nasi_lemak.webp"
    ]
  },
  {
    "nameBm": "Roti Telur",
    "image": "/assets/dishes/cutouts/roti_telur.webp",
    "ids": [
      "roti_telur"
    ],
    "legacyImages": [
      "/assets/dishes/vector/roti_canai.jpg",
      "/assets/dishes/vector/roti_telur.jpg",
      "/assets/dishes/vector/roti_telur.png",
      "/assets/dishes/vector/roti_telur.webp"
    ]
  },
  {
    "nameBm": "Roti Boom",
    "image": "/assets/dishes/cutouts/roti_boom.webp",
    "ids": [
      "roti_boom"
    ],
    "legacyImages": [
      "/assets/dishes/vector/roti_boom.jpg",
      "/assets/dishes/vector/roti_boom.png",
      "/assets/dishes/vector/roti_boom.webp"
    ]
  },
  {
    "nameBm": "Tosai",
    "image": "/assets/dishes/cutouts/tosai.webp",
    "ids": [
      "tosai"
    ],
    "legacyImages": [
      "/assets/dishes/vector/tosai.jpg",
      "/assets/dishes/vector/tosai.png",
      "/assets/dishes/vector/tosai.webp"
    ]
  },
  {
    "nameBm": "Roti Canai",
    "image": "/assets/dishes/cutouts/roti_canai.webp",
    "ids": [
      "roti_canai"
    ],
    "legacyImages": [
      "/assets/dishes/vector/roti_canai.jpg",
      "/assets/dishes/vector/roti_canai.png",
      "/assets/dishes/vector/roti_canai.webp"
    ]
  },
  {
    "nameBm": "Kuih Muih Campur",
    "image": "/assets/dishes/cutouts/kuih_muih_campur.webp",
    "ids": [
      "kuih_muih_campur_sarapan",
      "kuih_muih_campur_petang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/kuih_muih.jpg",
      "/assets/dishes/vector/kuih_muih.png",
      "/assets/dishes/vector/kuih_muih.webp"
    ]
  },
  {
    "nameBm": "Telur Mata Sapi",
    "image": "/assets/dishes/cutouts/telur_mata_sapi.webp",
    "ids": [
      "telur_mata_sapi_sarapan",
      "telur_mata_sapi_lunch"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_lemak.jpg",
      "/assets/dishes/vector/telur_mata_sapi.jpg",
      "/assets/dishes/vector/telur_mata_sapi.png",
      "/assets/dishes/vector/telur_mata_sapi.webp"
    ]
  },
  {
    "nameBm": "Kari Kambing",
    "image": "/assets/dishes/cutouts/kari_kambing.webp",
    "ids": [
      "kari_kambing"
    ],
    "legacyImages": [
      "/assets/dishes/vector/kari_kambing.jpg",
      "/assets/dishes/vector/kari_kambing.png",
      "/assets/dishes/vector/kari_kambing.webp"
    ]
  },
  {
    "nameBm": "Rendang Daging",
    "image": "/assets/dishes/cutouts/rendang_daging.webp",
    "ids": [
      "rendang_daging"
    ],
    "legacyImages": [
      "/assets/dishes/vector/rendang_daging.jpg",
      "/assets/dishes/vector/rendang_daging.png",
      "/assets/dishes/vector/rendang_daging.webp"
    ]
  },
  {
    "nameBm": "Sambal Udang",
    "image": "/assets/dishes/cutouts/sambal_udang.webp",
    "ids": [
      "sambal_udang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/sambal_udang.jpg",
      "/assets/dishes/vector/sambal_udang.png",
      "/assets/dishes/vector/sambal_udang.webp"
    ]
  },
  {
    "nameBm": "Udang Goreng Tepung",
    "image": "/assets/dishes/cutouts/udang_goreng_tepung.webp",
    "ids": [
      "udang_goreng_tepung"
    ],
    "legacyImages": [
      "/assets/dishes/vector/sambal_udang.jpg",
      "/assets/dishes/vector/udang_goreng_tepung.jpg",
      "/assets/dishes/vector/udang_goreng_tepung.png",
      "/assets/dishes/vector/udang_goreng_tepung.webp"
    ]
  },
  {
    "nameBm": "Nasi Briyani",
    "image": "/assets/dishes/cutouts/nasi_briyani.webp",
    "ids": [
      "nasi_briyani"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_briyani.jpg",
      "/assets/dishes/vector/nasi_briyani.png",
      "/assets/dishes/vector/nasi_briyani.webp"
    ]
  },
  {
    "nameBm": "Dendeng",
    "image": "/assets/dishes/cutouts/dendeng.webp",
    "ids": [
      "dendeng"
    ],
    "legacyImages": [
      "/assets/dishes/vector/dendeng.jpg",
      "/assets/dishes/vector/dendeng.png",
      "/assets/dishes/vector/dendeng.webp",
      "/assets/dishes/vector/rendang_daging.jpg"
    ]
  },
  {
    "nameBm": "Daging Masak Merah",
    "image": "/assets/dishes/cutouts/daging_masak_merah.webp",
    "ids": [
      "daging_masak_merah"
    ],
    "legacyImages": [
      "/assets/dishes/vector/daging_masak_merah.jpg",
      "/assets/dishes/vector/daging_masak_merah.png",
      "/assets/dishes/vector/daging_masak_merah.webp",
      "/assets/dishes/vector/rendang_daging.jpg"
    ]
  },
  {
    "nameBm": "Sambal Sotong",
    "image": "/assets/dishes/cutouts/sambal_sotong.webp",
    "ids": [
      "sambal_sotong"
    ],
    "legacyImages": [
      "/assets/dishes/vector/sambal_sotong.jpg",
      "/assets/dishes/vector/sambal_sotong.png",
      "/assets/dishes/vector/sambal_sotong.webp",
      "/assets/dishes/vector/sambal_udang.jpg"
    ]
  },
  {
    "nameBm": "Asam Pedas",
    "image": "/assets/dishes/cutouts/asam_pedas.webp",
    "ids": [
      "asam_pedas"
    ],
    "legacyImages": [
      "/assets/dishes/vector/asam_pedas.jpg",
      "/assets/dishes/vector/asam_pedas.png",
      "/assets/dishes/vector/asam_pedas.webp"
    ]
  },
  {
    "nameBm": "Daging Masak Hitam",
    "image": "/assets/dishes/cutouts/daging_masak_hitam.webp",
    "ids": [
      "daging_masak_hitam"
    ],
    "legacyImages": [
      "/assets/dishes/vector/daging_masak_hitam.jpg",
      "/assets/dishes/vector/daging_masak_hitam.png",
      "/assets/dishes/vector/daging_masak_hitam.webp",
      "/assets/dishes/vector/rendang_daging.jpg"
    ]
  },
  {
    "nameBm": "Ikan Keli Sambal",
    "image": "/assets/dishes/cutouts/ikan_keli_sambal.webp",
    "ids": [
      "ikan_keli_sambal"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ikan_keli.jpg",
      "/assets/dishes/vector/ikan_keli.png",
      "/assets/dishes/vector/ikan_keli.webp"
    ]
  },
  {
    "nameBm": "Ikan Goreng Berlada",
    "image": "/assets/dishes/cutouts/ikan_goreng_berlada.webp",
    "ids": [
      "ikan_goreng_berlada"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ikan_goreng_berlada.jpg",
      "/assets/dishes/vector/ikan_goreng_berlada.png",
      "/assets/dishes/vector/ikan_goreng_berlada.webp",
      "/assets/dishes/vector/ikan_keli.jpg"
    ]
  },
  {
    "nameBm": "Masak Lemak Cili Api",
    "image": "/assets/dishes/cutouts/masak_lemak_cili_api.webp",
    "ids": [
      "masak_lemak_cili_api"
    ],
    "legacyImages": [
      "/assets/dishes/vector/masak_lemak.jpg",
      "/assets/dishes/vector/masak_lemak.png",
      "/assets/dishes/vector/masak_lemak.webp"
    ]
  },
  {
    "nameBm": "Ayam Paprik",
    "image": "/assets/dishes/cutouts/ayam_paprik.webp",
    "ids": [
      "ayam_paprik"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ayam_berempah.jpg",
      "/assets/dishes/vector/ayam_paprik.jpg",
      "/assets/dishes/vector/ayam_paprik.png",
      "/assets/dishes/vector/ayam_paprik.webp"
    ]
  },
  {
    "nameBm": "Rendang Ayam",
    "image": "/assets/dishes/cutouts/rendang_ayam.webp",
    "ids": [
      "rendang_ayam"
    ],
    "legacyImages": [
      "/assets/dishes/vector/rendang_ayam.jpg",
      "/assets/dishes/vector/rendang_ayam.png",
      "/assets/dishes/vector/rendang_ayam.webp",
      "/assets/dishes/vector/rendang_daging.jpg"
    ]
  },
  {
    "nameBm": "Ayam Kurma",
    "image": "/assets/dishes/cutouts/ayam_kurma.webp",
    "ids": [
      "ayam_kurma"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ayam_berempah.jpg",
      "/assets/dishes/vector/ayam_kurma.jpg",
      "/assets/dishes/vector/ayam_kurma.png",
      "/assets/dishes/vector/ayam_kurma.webp"
    ]
  },
  {
    "nameBm": "Ayam Goreng Berempah",
    "image": "/assets/dishes/cutouts/ayam_goreng_berempah.webp",
    "ids": [
      "ayam_goreng_berempah"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ayam_berempah.jpg",
      "/assets/dishes/vector/ayam_berempah.png",
      "/assets/dishes/vector/ayam_berempah.webp"
    ]
  },
  {
    "nameBm": "Nasi Campur",
    "image": "/assets/dishes/cutouts/nasi_campur.webp",
    "ids": [
      "nasi_campur"
    ],
    "legacyImages": [
      "/assets/dishes/photos/nasi-campur.jpg",
      "/assets/dishes/photos/nasi-campur.png",
      "/assets/dishes/photos/nasi-campur.webp"
    ]
  },
  {
    "nameBm": "Ayam Masak Kicap",
    "image": "/assets/dishes/cutouts/ayam_masak_kicap.webp",
    "ids": [
      "ayam_masak_kicap"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ayam_berempah.jpg",
      "/assets/dishes/vector/ayam_masak_kicap.jpg",
      "/assets/dishes/vector/ayam_masak_kicap.png",
      "/assets/dishes/vector/ayam_masak_kicap.webp"
    ]
  },
  {
    "nameBm": "Ayam Masak Merah",
    "image": "/assets/dishes/cutouts/ayam_masak_merah.webp",
    "ids": [
      "ayam_masak_merah"
    ],
    "legacyImages": [
      "/assets/dishes/vector/ayam_berempah.jpg",
      "/assets/dishes/vector/ayam_masak_merah.jpg",
      "/assets/dishes/vector/ayam_masak_merah.png",
      "/assets/dishes/vector/ayam_masak_merah.webp"
    ]
  },
  {
    "nameBm": "Nasi Goreng Kampung",
    "image": "/assets/dishes/cutouts/nasi_goreng_kampung.webp",
    "ids": [
      "nasi_goreng_kampung"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_goreng_kampung.jpg",
      "/assets/dishes/vector/nasi_goreng_kampung.png",
      "/assets/dishes/vector/nasi_goreng_kampung.webp",
      "/assets/dishes/vector/nasi_lemak.jpg"
    ]
  },
  {
    "nameBm": "Nasi Goreng Cina",
    "image": "/assets/dishes/cutouts/nasi_goreng_cina.webp",
    "ids": [
      "nasi_goreng_cina"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_goreng_cina.jpg",
      "/assets/dishes/vector/nasi_goreng_cina.png",
      "/assets/dishes/vector/nasi_goreng_cina.webp",
      "/assets/dishes/vector/nasi_lemak.jpg"
    ]
  },
  {
    "nameBm": "Pucuk Paku Masak Lemak",
    "image": "/assets/dishes/cutouts/pucuk_paku_masak_lemak.webp",
    "ids": [
      "pucuk_paku_masak_lemak"
    ],
    "legacyImages": [
      "/assets/dishes/vector/masak_lemak.jpg",
      "/assets/dishes/vector/pucuk_paku.jpg",
      "/assets/dishes/vector/pucuk_paku.png",
      "/assets/dishes/vector/pucuk_paku.webp"
    ]
  },
  {
    "nameBm": "Kerabu",
    "image": "/assets/dishes/cutouts/kerabu.webp",
    "ids": [
      "kerabu"
    ],
    "legacyImages": [
      "/assets/dishes/vector/masak_lemak.jpg",
      "/assets/dishes/vector/masak_lemak.png",
      "/assets/dishes/vector/masak_lemak.webp"
    ]
  },
  {
    "nameBm": "Kangkung Belacan",
    "image": "/assets/dishes/cutouts/kangkung_belacan.webp",
    "ids": [
      "kangkung_belacan"
    ],
    "legacyImages": [
      "/assets/dishes/vector/kangkung_belacan.jpg",
      "/assets/dishes/vector/kangkung_belacan.png",
      "/assets/dishes/vector/kangkung_belacan.webp",
      "/assets/dishes/vector/masak_lemak.jpg"
    ]
  },
  {
    "nameBm": "Sayur Campur",
    "image": "/assets/dishes/cutouts/sayur_campur.webp",
    "ids": [
      "sayur_campur"
    ],
    "legacyImages": [
      "/assets/dishes/vector/masak_lemak.jpg",
      "/assets/dishes/vector/sayur_campur.jpg",
      "/assets/dishes/vector/sayur_campur.png",
      "/assets/dishes/vector/sayur_campur.webp"
    ]
  },
  {
    "nameBm": "Nasi Tomato",
    "image": "/assets/dishes/cutouts/nasi_tomato.webp",
    "ids": [
      "nasi_tomato"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_briyani.jpg",
      "/assets/dishes/vector/nasi_tomato.jpg",
      "/assets/dishes/vector/nasi_tomato.png",
      "/assets/dishes/vector/nasi_tomato.webp"
    ]
  },
  {
    "nameBm": "Taugeh Goreng",
    "image": "/assets/dishes/cutouts/taugeh_goreng.webp",
    "ids": [
      "taugeh_goreng"
    ],
    "legacyImages": [
      "/assets/dishes/vector/masak_lemak.jpg",
      "/assets/dishes/vector/taugeh_goreng.jpg",
      "/assets/dishes/vector/taugeh_goreng.png",
      "/assets/dishes/vector/taugeh_goreng.webp"
    ]
  },
  {
    "nameBm": "Nasi Minyak",
    "image": "/assets/dishes/cutouts/nasi_minyak.webp",
    "ids": [
      "nasi_minyak"
    ],
    "legacyImages": [
      "/assets/dishes/vector/nasi_briyani.jpg",
      "/assets/dishes/vector/nasi_briyani.png",
      "/assets/dishes/vector/nasi_briyani.webp"
    ]
  },
  {
    "nameBm": "Telur Dadar",
    "image": "/assets/dishes/cutouts/telur_dadar.webp",
    "ids": [
      "telur_dadar"
    ],
    "legacyImages": [
      "/assets/dishes/vector/roti_canai.jpg",
      "/assets/dishes/vector/telur_dadar.jpg",
      "/assets/dishes/vector/telur_dadar.png",
      "/assets/dishes/vector/telur_dadar.webp"
    ]
  },
  {
    "nameBm": "Bergedil",
    "image": "/assets/dishes/cutouts/bergedil.webp",
    "ids": [
      "bergedil"
    ],
    "legacyImages": [
      "/assets/dishes/vector/bergedil.jpg",
      "/assets/dishes/vector/bergedil.png",
      "/assets/dishes/vector/bergedil.webp",
      "/assets/dishes/vector/soto_ayam.jpg"
    ]
  },
  {
    "nameBm": "Rojak Singapore",
    "image": "/assets/dishes/cutouts/rojak_singapore.webp",
    "ids": [
      "rojak_singapore"
    ],
    "legacyImages": [
      "/assets/dishes/vector/rojak_singapore.jpg",
      "/assets/dishes/vector/rojak_singapore.png",
      "/assets/dishes/vector/rojak_singapore.webp"
    ]
  },
  {
    "nameBm": "Rojak Buah",
    "image": "/assets/dishes/cutouts/rojak_buah.webp",
    "ids": [
      "rojak_buah"
    ],
    "legacyImages": [
      "/assets/dishes/vector/rojak_buah.jpg",
      "/assets/dishes/vector/rojak_buah.png",
      "/assets/dishes/vector/rojak_buah.webp",
      "/assets/dishes/vector/rojak_singapore.jpg"
    ]
  },
  {
    "nameBm": "Popia",
    "image": "/assets/dishes/cutouts/popia.webp",
    "ids": [
      "popia"
    ],
    "legacyImages": [
      "/assets/dishes/vector/pisang_goreng.jpg",
      "/assets/dishes/vector/popia.jpg",
      "/assets/dishes/vector/popia.png",
      "/assets/dishes/vector/popia.webp"
    ]
  },
  {
    "nameBm": "Pisang Goreng Crisp",
    "image": "/assets/dishes/cutouts/pisang_goreng_crisp.webp",
    "ids": [
      "pisang_goreng_crisp"
    ],
    "legacyImages": [
      "/assets/dishes/vector/pisang_goreng.jpg",
      "/assets/dishes/vector/pisang_goreng.png",
      "/assets/dishes/vector/pisang_goreng.webp"
    ]
  },
  {
    "nameBm": "Samosa Kentang",
    "image": "/assets/dishes/cutouts/samosa_kentang.webp",
    "ids": [
      "samosa_kentang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/pisang_goreng.jpg",
      "/assets/dishes/vector/samosa_kentang.jpg",
      "/assets/dishes/vector/samosa_kentang.png",
      "/assets/dishes/vector/samosa_kentang.webp"
    ]
  },
  {
    "nameBm": "Cucur Goreng Pisang",
    "image": "/assets/dishes/cutouts/cucur_goreng_pisang.webp",
    "ids": [
      "cucur_goreng_pisang"
    ],
    "legacyImages": [
      "/assets/dishes/vector/cucur_pisang.jpg",
      "/assets/dishes/vector/cucur_pisang.png",
      "/assets/dishes/vector/cucur_pisang.webp",
      "/assets/dishes/vector/pisang_goreng.jpg"
    ]
  },
  {
    "nameBm": "Milo",
    "image": "/assets/drinks/cutouts/milo.webp",
    "ids": [
      "milo_panas"
    ],
    "legacyImages": [
      "/assets/drinks/milo_vector.jpg",
      "/assets/drinks/milo_vector.png",
      "/assets/drinks/milo_vector.webp"
    ]
  },
  {
    "nameBm": "Nescafe",
    "image": "/assets/drinks/cutouts/nescafe.webp",
    "ids": [
      "nescafe_panas"
    ],
    "legacyImages": [
      "/assets/drinks/kopi_kampung_vector.jpg",
      "/assets/drinks/kopi_kampung_vector.png",
      "/assets/drinks/kopi_kampung_vector.webp"
    ]
  },
  {
    "nameBm": "Teh Tarik",
    "image": "/assets/drinks/cutouts/teh_tarik.webp",
    "ids": [
      "teh_tarik"
    ],
    "legacyImages": [
      "/assets/drinks/teh_tarik.jpg",
      "/assets/drinks/teh_tarik.png",
      "/assets/drinks/teh_tarik.webp"
    ]
  },
  {
    "nameBm": "Kopi",
    "image": "/assets/drinks/cutouts/kopi.webp",
    "ids": [
      "kopi_kampung"
    ],
    "legacyImages": [
      "/assets/drinks/kopi_kampung_vector.jpg",
      "/assets/drinks/kopi_kampung_vector.png",
      "/assets/drinks/kopi_kampung_vector.webp"
    ]
  },
  {
    "nameBm": "Nescafe O",
    "image": "/assets/drinks/cutouts/nescafe_o.webp",
    "ids": [
      "nescafe_o"
    ],
    "legacyImages": [
      "/assets/drinks/kopi_kampung_vector.jpg",
      "/assets/drinks/kopi_kampung_vector.png",
      "/assets/drinks/kopi_kampung_vector.webp"
    ]
  },
  {
    "nameBm": "Milo O",
    "image": "/assets/drinks/cutouts/milo_o.webp",
    "ids": [
      "milo_o"
    ],
    "legacyImages": [
      "/assets/drinks/milo_vector.jpg",
      "/assets/drinks/milo_vector.png",
      "/assets/drinks/milo_vector.webp"
    ]
  },
  {
    "nameBm": "Teh O",
    "image": "/assets/drinks/cutouts/teh_o.webp",
    "ids": [
      "teh_o"
    ],
    "legacyImages": [
      "/assets/drinks/teh_tarik.jpg",
      "/assets/drinks/teh_tarik.png",
      "/assets/drinks/teh_tarik.webp"
    ]
  },
  {
    "nameBm": "Kopi O",
    "image": "/assets/drinks/cutouts/kopi_o.webp",
    "ids": [
      "kopi_o"
    ],
    "legacyImages": [
      "/assets/drinks/kopi_kampung_vector.jpg",
      "/assets/drinks/kopi_kampung_vector.png",
      "/assets/drinks/kopi_kampung_vector.webp"
    ]
  },
  {
    "nameBm": "Sirap Bandung",
    "image": "/assets/drinks/cutouts/sirap_bandung.webp",
    "ids": [
      "sirap_bandung"
    ],
    "legacyImages": [
      "/assets/drinks/sirap_bandung.jpg",
      "/assets/drinks/sirap_bandung.png",
      "/assets/drinks/sirap_bandung.webp"
    ]
  },
  {
    "nameBm": "Tetra Pak Peel Fresh Kecil",
    "image": "/assets/drinks/cutouts/tetra_pak_peel_fresh_kecil.webp",
    "ids": [
      "tetra_pak_peel_fresh_kecil"
    ],
    "legacyImages": [
      "/assets/drinks/mineral_water_vector.jpg",
      "/assets/drinks/mineral_water_vector.png",
      "/assets/drinks/mineral_water_vector.webp"
    ]
  },
  {
    "nameBm": "Air Tetra Pak Berperisa",
    "image": "/assets/drinks/cutouts/air_tetra_pak_berperisa.webp",
    "ids": [
      "air_tetra_pak_berperisa"
    ],
    "legacyImages": [
      "/assets/drinks/mineral_water_vector.jpg",
      "/assets/drinks/mineral_water_vector.png",
      "/assets/drinks/mineral_water_vector.webp"
    ]
  },
  {
    "nameBm": "Tetra Pak Mineral Water",
    "image": "/assets/drinks/cutouts/tetra_pak_mineral_water.webp",
    "ids": [
      "tetra_pak_mineral_water"
    ],
    "legacyImages": [
      "/assets/drinks/mineral_water_vector.jpg",
      "/assets/drinks/tetra_mineral.jpg",
      "/assets/drinks/tetra_mineral.png",
      "/assets/drinks/tetra_mineral.webp"
    ]
  },
  {
    "nameBm": "Air Kordial",
    "image": "/assets/drinks/cutouts/air_kordial.webp",
    "ids": [
      "air_kordial"
    ],
    "legacyImages": [
      "/assets/drinks/air_kordial.jpg",
      "/assets/drinks/air_kordial.png",
      "/assets/drinks/air_kordial.webp",
      "/assets/drinks/sirap_bandung.jpg"
    ]
  },
  {
    "nameBm": "Air Mineral Botol",
    "image": "/assets/drinks/cutouts/air_mineral_botol.webp",
    "ids": [
      "air_mineral_botol"
    ],
    "legacyImages": [
      "/assets/drinks/mineral_water_vector.jpg",
      "/assets/drinks/mineral_water_vector.png",
      "/assets/drinks/mineral_water_vector.webp"
    ]
  }
];

const byId = new Map<string, MenuImageEntry>();
const byName = new Map<string, MenuImageEntry>();
for (const entry of entries) {
  byName.set(entry.nameBm, entry);
  for (const id of entry.ids) byId.set(id, entry);
}
const aliases: Readonly<Record<string, string>> = {"Asam Pedas Ikan Pari": "Asam Pedas", "Nasi Lemak": "Nasi Lemak Biasa", "Mee Soto Ayam": "Mee Soto", "Soto Ayam Nasi Impit": "Soto Ayam", "Teh Tarik Kaw": "Teh Tarik", "Kopi 434 Kopi Kampung": "Kopi O"};
for (const [alias, name] of Object.entries(aliases)) {
  const entry = byName.get(name);
  if (entry) byName.set(alias, entry);
}

export const MENU_CUTOUT_IMAGES: Readonly<Record<string, string>> =
  Object.fromEntries([...byName].map(([name, entry]) => [name, entry.image]));

export function getMenuCutoutImage(item: { id?: unknown; nameBm?: unknown; nameEn?: unknown } | null | undefined): string | undefined {
  if (!item) return undefined;
  const entry = typeof item.id === 'string' ? byId.get(item.id) : undefined;
  if (entry && (item.nameBm == null || item.nameBm === entry.nameBm)) return entry.image;
  const name = typeof item.nameBm === 'string' ? item.nameBm : item.nameEn;
  return typeof name === 'string' ? byName.get(name)?.image : undefined;
}

export function correctDefaultMenuImage<T extends { id: string; nameBm?: unknown; image?: unknown }>(item: T): T {
  const entry = byId.get(item.id);
  if (!entry || item.nameBm !== entry.nameBm) return item;
  const knownDefault = item.image == null || item.image === '' ||
    (typeof item.image === 'string' && entry.legacyImages.includes(item.image));
  return knownDefault ? { ...item, image: entry.image } : item;
}

export function isMenuCutoutImage(src: string): boolean {
  return /^\/assets\/(?:dishes|drinks)\/cutouts\/[^/?]+\.webp(?:[?#]|$)/.test(src);
}
