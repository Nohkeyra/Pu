# Lima cadangan penyelarasan UI/UX — pelaksanaan dan bukti

Asas: Nohkeyra/Pu main 50a3aac28176bf86aa5a15c9812aec80bda520bf (1.3.157/289), dengan patch audit dan Tempah/Tetapan terdahulu. Status: PARTIAL — pelaksanaan dan verifikasi web selesai dalam skop ini; APK fizikal, sesi ahli/admin sebenar dan backend langsung belum diuji.

## Pemetaan lima cadangan yang disahkan pemilik

| Cadangan | Pelaksanaan dalam pakej gabungan ini |
| --- | --- |
| 1. Pengepala konsisten | Tempah, Tetapan, Jadual dan Profil menggunakan CustomerPageHeader yang sama. Logo dan Uncial Antiqua / font-artistic dikekalkan. Bar jenama dan bar tajuk dipisahkan. |
| 2. Kawalan teratur dan destinasi jelas | Tema pada bar jenama; tindakan akaun/tambahan melalui menu. Destinasi rumah menggunakan ikon/label Utama/Home. Kembali/Back digunakan apabila navigasi benar-benar kembali dalam sejarah app. |
| 3. Jarak dan saiz seimbang | Gutter dan ruang atas melalui shell bersama. Kandungan Jadual lebih luas; Profil lebih terhad. Butang pengepala 44px minimum. Baris kawalan admin dalam Tetapan boleh membalut apabila ruang sempit. |
| 4. Dialog dan tab satu keluarga | Dialog Radix mempunyai tajuk/penerangan sejajar kiri, ruang tutup, tinggi terkawal dengan scroll dan footer tindakan berasingan. AuthModal mengikuti hierarki sama sambil mengekalkan bentuk sheet telefon. SegmentedControl dan pemilih paparan admin menggunakan radius, ukuran sentuhan, permukaan aktif dan aksen yang sepadan. Tab profil sedia ada sudah sepadan; pengendali tabnya tidak ditukar. |
| 5. Batik sebagai aksen | Overlay batik penuh dalam AuthModal diganti aksen sudut pengepala. Kalendar menggunakan batik halus di bar nama hari, bukan di setiap sel bulan lain. Aksen pada borang dan banner profil serta garis batik nipis dialog dikekalkan. Landing/splash/aset asal tidak disunting. |

Ini penyelarasan empat halaman pelanggan dan komponen UI yang disebut, bukan dakwaan setiap skrin khusus atau setiap keadaan data sudah diperiksa secara langsung.

## Pembaikan aliran yang turut disertakan
Tarikh yang dipilih di Jadual dibawa ke medan tarikh borang menggunakan aliran initial-data sedia ada. Kegagalan API jadual dibezakan daripada senarai kosong, dengan Cuba lagi dan perlindungan permintaan dibatalkan. Lihat CALENDAR_PROFILE_RESTYLE.md untuk butiran.

## CONFIRMED: integriti fungsi dan aset
- Bahagian deklarasi, state dan semua handler AuthModal sebelum render dibandingkan secara bait dengan baseline: tidak berubah. Pindaan AuthModal hanya import komponen hiasan/CSS dan markup/gaya paparan; proses auth tidak diubah.
- UserProfileDashboard dan fail komponen profil tidak disunting. Pemilih tab profil sedia ada masih mengendalikan anak panah papan kekunci.
- Semua fail public dibandingkan secara bait dengan baseline dan sepadan. SplashScreen.tsx serta fail src/sections juga sepadan. Fail gambar/logo/fon tidak diganti.
- Tiada dependency, backend, versi app atau konfigurasi Android diubah. Konfigurasi sementara, fixture UI, data simulasi, screenshot dan hasil build tidak disertakan dalam ZIP.

## CONFIRMED: semakan
- npm run lint: PASS.
- npm run test -- --maxWorkers=1: 27 fail / 265 ujian PASS pada baseline gabungan patch terdahulu.
- tsc --noEmit -p tsconfig.app.json: PASS.
- npm run build: PASS (Vite + esbuild server bundle).
- e2e/calendar-flow.spec.ts: 6 ujian Playwright PASS, meliputi dua tema untuk gagal/cuba lagi, Utama/Kembali dan pengisian tarikh borang. Dijalankan terhadap build statik tempatan dengan konfigurasi sementara, Chromium sistem dan API simulasi. npm run test:e2e -- e2e/calendar-flow.spec.ts menggunakan setup repo biasa.
- Build sebenar: Jadual/Profil/Tempah/Tetapan pada 320/390/768/1280px, dua tema; pengepala sejajar, fon asal dimuatkan, tiada limpahan mendatar dan kawasan butang pengepala minimum 44px dengan toleransi pembundaran pelayar.
- Dialog log masuk/daftar build sebenar pada 320/390/768px; scroll, Escape, aksen batik dan pertukaran BM/EN dalam Tetapan diperiksa.
- Komponen sebenar AdminPanel, ProfileNavigation dan dialog umum diuji melalui fixture UI tempatan yang berasingan. Hook data admin disimulasikan kosong; ini BUKAN sesi admin sebenar. Pemilih paparan admin muat pada 320/390/768/1280px; tab bertukar; tab profil boleh dipilih dengan anak panah; dialog panjang muat viewport, boleh scroll dan ditutup dengan Escape. Kedua-dua tema diperiksa.
- Page errors: 0 pada semakan akhir. Permintaan luaran disekat. Tiada tempahan dihantar atau log masuk sebenar dibuat. Screenshot menyatakan asal data/fixture apabila berkaitan.
- git diff --check: PASS.

## Pemasangan
Gunakan ZIP ini selepas Wawasan-pembaikan-audit-uiux.zip dan Wawasan-Tempah-Tetapan-selaras.zip. Ia menggabungkan sambungan Jadual/Profil dan kemasan dialog/tab, termasuk fail bertindih yang telah digabungkan dengan patch terdahulu. Tidak perlu memasang ZIP checkpoint Jadual/Profil berasingan.

Gabungkan mengikut path asal pada akar projek; tambah fail baharu dan gantikan fail yang sepadan. Tiada fail perlu dipadam. Ini patch, bukan keseluruhan repo atau APK. Bina semula APK melalui aliran sedia ada untuk melihat perubahan dalam aplikasi dipasang.

## Batas / UNKNOWN
APK/peranti fizikal, papan kekunci native, semua dialog khusus dan sesi ahli/admin berdata sebenar belum disahkan. Ujian API/data langsung tidak dilakukan. Dialog khusus seperti dokumen dan peta mengekalkan susunan mengikut fungsinya; tidak semuanya dipaksa mempunyai lebar sama.

Rujukan: arah visual yang diluluskan pemilik; AGENTS.md, SKILL.md dan README repo; panduan komponen Android yang dirujuk sebelum ini (https://developer.android.com/design/ui/mobile/guides/components/material-overview). Tiada dakwaan carian trend baharu. docs/DESIGN_SYSTEM_SKILL.md dan docs/SECURITY_SPEC.md yang disebut AGENTS.md tidak tersedia dalam snapshot ini; keputusan paparan berdasarkan sumber komponen sebenar dan arahan pemilik. Kod keselamatan/auth tidak diubah.
