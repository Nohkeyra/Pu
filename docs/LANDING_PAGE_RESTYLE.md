# Landing page Wawasan — kemasan UI/UX

Tarikh: 1 November 2026.
Asas repo terkini ketika kerja dimulakan: `a649712dc8599d7fcea52fd512b75c19a0047a4a` (1.3.158 / 290).

## Hasil

Pelaksanaan kemasan landing page selesai dalam kod. Status pengesahan keseluruhan: **PARTIAL** — semakan web tempatan lulus; APK/peranti fizikal dan deployment belum dilakukan.

CONFIRMED — perubahan:

- Hero mempunyai tindakan Tempah Katering yang utama, pautan Lihat Menu yang sekunder, gambar Nasi Campur asal dan kad ringkas nama sajian. Teks serta gambar disusun bersebelahan pada skrin luas dan menegak pada telefon. Tiada lagi minimum satu skrin penuh yang dipaksa pada hero.
- Pautan ringkas menuju menu, tempahan dan lokasi. Menu diletakkan sebelum kisah restoran supaya pelawat boleh menjumpai sajian lebih awal. Pautan kisah/pengalaman/ulasan/lawatan kekal.
- Palet krim, hijau hutan dan jingga hangat, dengan permukaan dan garis sempadan yang sama keluarga dengan halaman pelanggan. Batik digunakan pada hero, satu pemisah warisan dan footer; pembahagi batik berulang antara setiap bahagian dibuang.
- Kad sajian mempunyai nama, penerangan, harga asal dan butang semantik. Carian mempunyai label; kategori menunjukkan pilihan aktif; tiada padanan mempunyai penerangan dan tindakan memulihkan semua sajian. Kesan tilt 3D, lapisan glass serta butang berlapis batik pada setiap kad dikeluarkan.
- Kisah, pengalaman, ulasan dan lokasi menggunakan tajuk, latar, radius dan sempadan yang diselaraskan. Butang arah lokasi tidak lagi menggunakan gabungan hijau/kuning yang berbeza daripada keluarga tindakan app.
- Header landing menggunakan permukaan jelas dari awal. Butang bahasa/log masuk desktop mempunyai lebar mengikut label, bukannya lebar ikon tetap. Pada telefon padat, akaun dan pilihan tema tertentu kekal boleh dicapai melalui menu tanpa mengecilkan font jenama atau mengeluarkan butang dari skrin.
- Menu tablet dibaiki: ambang paparan kini sama dengan header (1280px). Overlay dipaparkan melalui portal, memegang fokus Tab/Shift+Tab, menyokong Escape dan memulihkan fokus. Scroll lock dibersihkan apabila ditutup. Beralih ke paparan desktop menutup menu mudah alih.
- Footer dipermudah, teks utiliti diselaraskan mengikut BM/English dan pautan Facebook diberi nama yang boleh dibaca pembaca skrin. Nama fail muat turun APK dibetulkan kepada `app-release-signed.apk`, disahkan terhadap aset keluaran GitHub v1.3.158.
- Animasi ringkas menghormati reduced motion. Autoplay ulasan berhenti apabila reduced motion dipilih. Pengendali pautan bahagian turut menghormati pilihan itu.

## Perlindungan kandungan

- Kelas tipografi hero `font-artistic` dibandingkan dengan versi asal dan sepadan. Font jenama Uncial Antiqua, nama jenama dan logo dikekalkan.
- Tiada fail dalam `public/`, fail font, `src/constants/menu.ts`, `src/index.css` atau splash disunting. Foto yang sama daripada senarai landing sedia ada digunakan; tiada gambar baharu dijana dan tiada padanan gambar menu ditukar.
- Harga, senarai sajian, kandungan ulasan tempatan, maklumat lokasi dan logik tempahan tidak diganti dengan data rekaan.
- Tiada dependency runtime baharu, perubahan backend, konfigurasi Firebase atau perubahan native Android dalam pakej ini. Varian header lalai untuk halaman lain dikekalkan. Penambahbaikan reduced-motion pada pautan bahagian ialah satu perubahan kecil pada pengendali bersama.

## Pengesahan

CONFIRMED:

- `npm run lint`: lulus.
- `npm run typecheck`: frontend dan server lulus.
- `npm run test -- --maxWorkers=1`: 297 ujian, 30 fail ujian lulus.
- `npm run build`: build Vite dan bundle server berjaya.
- Enam ujian Playwright dalam `e2e/landing-restyle.spec.ts` lulus: carian/kategori/pemulihan kosong, menu tablet/fokus/Escape/pautan bahagian, serta laluan tempahan pelawat dan font jenama. Kedua-dua tema diuji.
- 32 kombinasi tema/bahasa/lebar disemak: cerah/gelap, BM/English, 320/360/390/768/900/1024/1280/1440 px. Tiada limpahan mendatar, kawalan header yang kelihatan berada dalam skrin dan memenuhi sasaran minimum 44px, serta CTA utama dapat dilihat.
- Perbandingan Git mengesahkan fail gambar/font/data menu/splash tidak diubah. Arkib menggunakan laluan asal dan mempunyai manifest SHA-256.

Semakan browser menggunakan build produksi sebenar sebagai pelawat. Sambungan luaran disekat dan respons backend disimulasikan agar tiada akaun atau pesanan sebenar disentuh. Kandungan sajian dan foto datang daripada fail repo sedia ada. Ujian ini mengesahkan UI dan navigasi, bukan operasi backend produksi atau prestasi perkhidmatan peta luaran.

UNKNOWN / NOT RUN:

- Paparan dan interaksi APK pada telefon fizikal belum diuji.
- Tiada deployment web, build keluaran APK atau penghantaran pesanan sebenar dilakukan.
- Spesifikasi tambahan `docs/DESIGN_SYSTEM_SKILL.md` yang disebut AGENTS.md tidak wujud dalam checkout. Kerja berpandukan arahan pemilik, AGENTS.md/SKILL.md yang tersedia dan komponen app sebenar; tiada panduan daripada fail yang hilang direka.

## Pemasangan

1. Salin kandungan ZIP ke akar projek mengikut laluan asal. ZIP ialah patch fail berubah/ditambah, bukan repo penuh; jangan padam fail projek yang tidak tersenarai.
2. Jalankan lint, typecheck, test dan build seperti di atas.
3. Uji semula aliran pelawat dan ahli dalam projek anda. Untuk mengulangi suite browser dalam persekitaran Playwright projek: `npm run test:e2e -- e2e/landing-restyle.spec.ts`.
4. Terbitkan build web melalui aliran biasa. Untuk APK, jalankan build web dan `npx cap sync android`, kemudian bina APK melalui aliran projek yang sedia ada. Tiada perubahan native baharu diperlukan oleh patch ini.
5. Semak pada telefon sebelum menganggap pengesahan APK selesai.

## Sumber reka bentuk yang dirujuk

- Ben&Max oleh NODS: hubungan warna krim/terracotta, kandungan makanan dan laluan pertanyaan yang jelas. https://nods.studio/portfolio-projects/ben-max
- Food Show oleh Run For The Hills: palet neutral/hijau dan unsur botani sebagai sebahagian identiti warisan. https://runforthehills.com/projects/food-show

Rujukan digunakan untuk prinsip susunan dan hierarki. Grafik, logo dan foto mereka tidak disalin ke projek Wawasan.
