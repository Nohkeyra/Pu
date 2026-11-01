# Audit UI/UX dan aliran aplikasi Wawasan — 1.3.156

Snapshot: `be41731ef2071eb3274a00599946a67bfddaaac7` (`Nohkeyra/Pu/main`).
Status: **PARTIAL** — audit kod dan semakan pelayar diselesaikan dalam skop di bawah; Android fizikal, servis langsung dan sesi pentadbir berdata sebenar tidak diuji.

Tiada kod aplikasi diubah. Fail AGENTS.md disediakan dengan tambahan arahan pemilik untuk melindungi font jenama; tiada perubahan dihantar ke GitHub. Laporan ini membezakan isu yang dibuktikan melalui pelayar, dapatan kod dan cadangan reka bentuk.

## Kesimpulan

Aplikasi sudah mempunyai banyak pembaikan terdahulu. Profil baharu dan empat tabnya sudah masuk dalam repo ini; Admin, jadual, pilihan menu, semakan pesanan dan skrin kejayaan turut mempunyai komponen yang telah dikemas kini. Walau bagaimanapun, konsistensi seluruh aplikasi belum selesai. Cadangan seterusnya ialah menyelaraskan tema, struktur halaman dan label sambil membaiki isu tingkah laku yang dapat dihasilkan semula. Tiada keperluan yang dibuktikan untuk mengganti semua gambar atau membina semula seluruh aplikasi.

## Skop dan kaedah

- Inventori halaman, laluan, komponen bersama, borang tempahan, konteks tema/tetapan, panel profil, komponen admin, kalendar, aset dan konfigurasi binaan.
- Semakan sumber bahagian pelayan yang berkaitan dengan status pembatalan untuk memastikan label UI dibandingkan dengan keadaan sebenar sistem.
- Tujuh laluan awam pada viewport 390px dalam mod cerah dan gelap: home, order, calendar, settings, profile tanpa log masuk, login dan pintu masuk admin.
- Pelayar menggunakan build sebenar dalam pelayan tempatan, permintaan luar disekat dan respons API awam disimulasikan kosong. Tiada pesanan sebenar dihantar atau akaun sebenar digunakan.
- Ujian komponen React profil dengan data/servis simulasi yang dilabel: status cancel_requested/completed dan kegagalan pembacaan data.
- Audit laluan aset statik literal. Laluan dinamik dan rekod URL tersuai dalam pangkalan data tidak disahkan oleh imbasan ini.

## Dapatan yang patut didahulukan

### 1. Status pembatalan pelanggan tersalah label — tinggi, dibuktikan melalui pelayar

`ProfileOrdersTab.getStatusBadge` tidak mengendalikan `cancel_requested` dan `completed`; kedua-duanya jatuh kepada label lalai “Dalam Semakan”. Ini disahkan dengan komponen sebenar dan data simulasi. Pelayan memang menggunakan status `cancel_requested` apabila permohonan pembatalan dibuat. `completed` wujud dalam jenis Order, tetapi audit ini tidak membuktikan terdapat rekod langsung berstatus itu.

Kesan: pelanggan boleh menyangka permohonan pembatalan masih merupakan semakan tempahan baharu. Kalendar turut memaparkan beberapa kod status mentah seperti `cancel_requested`.

Cadangan: satu pemetaan status UI dengan label BM/EN dan warna semantik yang dikongsi, tanpa mengubah aturan status pelayan.

Bukti: [ProfileOrdersTab.tsx:424](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/components/profile/ProfileOrdersTab.tsx#L424), [orderRoutes.ts:541](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/server/routes/orderRoutes.ts#L541), [CalendarEventCard.tsx:59](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/components/calendar/CalendarEventCard.tsx#L59).

### 2. Gagal memuatkan pesanan kelihatan seperti tiada rekod — tinggi, dibuktikan melalui pelayar

Pengendali ralat listener pesanan hanya menulis ke console dan menamatkan loading. Apabila senarai masih kosong, UI memaparkan “Tiada Rekod Tempahan”. Kegagalan bacaan yang disimulasikan menghasilkan mesej itu.

Kesan: pengguna tidak dapat membezakan akaun tanpa tempahan daripada sambungan/permintaan yang gagal. Cadangan: keadaan ralat yang jelas dan butang cuba lagi; kekalkan data lama apabila sesuai dan nyatakan ia belum dikemas kini.

Bukti: [UserProfileDashboard.tsx:142](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/components/UserProfileDashboard.tsx#L142).

### 3. Kontras butang dialog Tetapan lemah dalam mod cerah — sederhana, ukuran pelayar

Butang “Faham & Tutup” mempunyai teks `rgb(12,69,60)` pada latar `rgb(163,49,14)`. Nisbah kontras yang dikira daripada warna sebenar ialah sekitar **1.55:1**. Mod gelap bagi butang yang sama sekitar 5.59:1. Beberapa butang dialog lain mengulang kelas warna yang sama; ukuran angka di atas khusus kepada dialog privasi.

Cadangan: gunakan warna teks yang ditetapkan untuk butang utama dan audit kontras mod cerah/gelap, termasuk warna aksen tersuai.

Bukti: [SettingsPage.tsx:1824](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/pages/SettingsPage.tsx#L1824).

### 4. Nilai warna fokus tidak sah selepas tetapan warna digunakan — sederhana, kod dan computed style

SettingsContext menulis warna HEX seperti `#a3310e` ke `--ring`, sedangkan tema menggunakan `hsl(var(--ring))`. Dalam pelayar nilai `--color-ring` menjadi `hsl(#a3310e)`, yang bukan sintaks warna sah. Select dan Badge menggunakan keluarga kelas `ring-ring`; sebahagian butang lain menggunakan pemboleh ubah warna terus dan tidak mengalami masalah yang sama.

Cadangan: gunakan jenis nilai yang konsisten untuk token warna. Ini tidak bermakna semua butang atau semua penukaran aksen rosak.

Bukti: [SettingsContext.tsx:306](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/context/SettingsContext.tsx#L306), [index.css:63](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/index.css#L63), [select.tsx:20](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/components/ui/select.tsx#L20).

## Penyelarasan reka bentuk yang masih berbaki

### 5. Dua keluarga token permukaan masih aktif — disahkan dalam kod/pelayar; kemasan visual

`tokens/colors.css` mengekalkan permukaan gelap `#242220`, manakala token kad HSL dalam `src/index.css` sekitar `#1c2622`. Kedua-duanya memang aktif. Sebahagian komponen menggunakan `--color-surface`, sebahagian `bg-card`, dan profil mempunyai gaya khususnya sendiri.

Perbezaan lapisan boleh disengajakan; kewujudan dua nilai sahaja bukan kerosakan. Namun, pemetaan yang bertindih ini menjadikan warna kad dan kawalan lebih mudah berbeza antara halaman. Cadangan: tetapkan peranan latar, kad dan lapisan tinggi dalam satu pemetaan tema dan gunakan komponen bersama secara konsisten.

Bukti: [tokens/colors.css:35](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/tokens/colors.css#L35), [index.css:262](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/index.css#L262), [ui/card.tsx](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/components/ui/card.tsx).

### 6. Struktur pengepala dan bahasa belum seragam — disahkan dalam kod; cadangan visual

Kalendar menggunakan PageShell; Order, Settings dan Profile mempunyai pengepala tersendiri. Landing dan Login menggunakan tajuk artistik, sedangkan profil menggunakan Outfit. Login juga mempunyai teks “Register” dan perenggan Melayu yang tidak mengikuti pilihan bahasa.

Arahan pemilik: kekalkan font dan gaya tulisan jenama “Restoran Wawasan” yang asal, termasuk Uncial Antiqua / font-artistic. Ia ialah identiti yang disengajakan, bukan gaya lama yang perlu diganti. Cadangan penyelarasan hanya melibatkan susunan pengepala, ruang logo, jarak kandungan, label UI dan tindakan kembali. Ruang editorial seperti hero boleh mempunyai identitinya sendiri. Utamakan Login/Auth, kemudian pengepala Order/Settings/Calendar dan dialog sokongan. Kekalkan gambar landing page sebagaimana arahan pengguna.

Bukti: [CalendarPage.tsx:667](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/pages/CalendarPage.tsx#L667), [OrderPage.tsx:94](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/pages/OrderPage.tsx#L94), [LoginPage.tsx:118](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/pages/LoginPage.tsx#L118).

### 7. Rating dan tarikh ulasan landing adalah nilai tetap — disahkan dalam kod

ReviewsSection menyimpan ulasan, nama sumber “Google Maps”, tarikh relatif seperti “4 weeks ago” dan rating 4.9 sebagai literal. Ini bukan bukti ulasan tersebut palsu; asal-usulnya tidak disahkan dalam audit ini. Ia juga bukan suapan Google secara langsung dan tarikh relatif tidak akan meningkat sendiri.

Cadangan: gunakan tarikh asal yang sah/nota tarikh kemas kini, atau integrasi yang sesuai jika data langsung diperlukan. Jangan menggambarkan angka tetap sebagai rating terkini tanpa semakan sumber.

Bukti: [ReviewsSection.tsx:8](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/sections/ReviewsSection.tsx#L8), [ReviewsSection.tsx:146](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/src/sections/ReviewsSection.tsx#L146).

### 8. Aset loading lama hilang — kecil, disahkan melalui imbasan fail

`UserProfileDashboard.tsx:600` masih merujuk `/assets/brand/pak_usop.png`, tetapi fail itu tiada. Kod menyediakan fallback teks, jadi ini tidak membuktikan aplikasi akan crash. Ia berlaku pada indikator tarik untuk segar semula, bukan mascot splash yang telah dibuang.

Cadangan: gunakan indikator loading berjenama yang benar-benar wujud. Fail dummy dalam ujian sengaja tidak dikira sebagai aset produksi yang hilang.

### 9. Fon utama bergantung pada Google Fonts — risiko konsistensi luar talian

Outfit dan Plus Jakarta Sans dimuatkan melalui pautan Google Fonts dalam index.html. Inventori fon tempatan hanya menunjukkan fon Pacifico untuk splash. Apabila rangkaian fon disekat dalam semakan, pelayar menggunakan fallback; ini boleh mengubah ukuran tajuk dan pembalutan teks. Audit ini tidak membuktikan semua APK sentiasa gagal memuatkan fon.

Cadangan: pertimbangkan hos sendiri fon asal yang sama, termasuk Uncial Antiqua, dengan lesen penggunaannya dikekalkan untuk ukuran teks yang lebih konsisten semasa permulaan dan luar talian.

Bukti: [index.html:27](https://github.com/Nohkeyra/Pu/blob/be41731ef2071eb3274a00599946a67bfddaaac7/index.html#L27).

## Keadaan ujian

- `npm run lint`: lulus.
- `npm run test`: 25 fail ujian, 244 ujian lulus.
- `npm run build`: Vite dan server berjaya.
- `npm run typecheck`: **tidak selesai**, proses dihentikan dengan kod 137; tiada keputusan TypeScript lengkap. Jangan tafsirkan ini sebagai lulus atau bukti ralat jenis tertentu.
- Pelayar, tujuh laluan awam pada 390px, kedua-dua tema yang disahkan aktif: tiada pageerror JavaScript dan tiada limpahan mendatar dalam keadaan yang diperiksa.
- Dialog privasi Settings diuji dalam kedua-dua tema, termasuk ukuran warna sebenar.
- Status dan kegagalan bacaan profil diuji dengan servis simulasi; tiada data pelanggan sebenar disentuh.
- Paparan admin berdata sebenar, Android fizikal, prestasi perkakasan, dan keselamatan menyeluruh: tidak disahkan.
- Dependency sedia ada dalam persekitaran digunakan untuk semakan; pemasangan bersih `npm ci` tidak dilakukan.

## Urutan kerja yang disyorkan

1. Betulkan label status dan keadaan ralat, termasuk ujian regresi kedua-duanya.
2. Selaraskan token warna/fokus dan kontras kawalan utama.
3. Kemaskan Login/Auth serta struktur pengepala halaman dan bahasa.
4. Selaraskan dialog, kad, tab dan jarak menggunakan komponen yang sama.
5. Semak maklumat ulasan statik, aset loading dan pemuatan fon.
6. Uji pada APK sebenar sebelum menyatakan keseluruhan pengalaman sudah disahkan.
