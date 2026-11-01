# Jadual & Profil — sambungan kemasan UI/UX

Asas repo: Nohkeyra/Pu main `50a3aac28176bf86aa5a15c9812aec80bda520bf`, versi 1.3.157 (289). Repo GitHub diperiksa semula pada awal kerja dan masih pada commit ini. Baseline tempatan turut mengandungi patch audit dan patch Tempah/Tetapan yang sudah dihantar kepada pemilik.

## Status
PARTIAL — pelaksanaan, build dan semakan web selesai. Ujian peranti Android fizikal, sesi ahli sebenar dan backend langsung belum dijalankan. Ini bukan dakwaan deploy atau pemasangan APK.

## CONFIRMED: skop
- Jadual dan Profil menggunakan CustomerPageHeader yang sama dengan Tempah dan Tetapan. Logo serta Uncial Antiqua / font-artistic dikekalkan.
- Jadual: kawalan bulan, Hari Ini, tarikh dipilih, permukaan kad, bar nama hari dan penekanan tarikh diselaraskan. Petunjuk nota, cuti dan data tempahan sedia ada kekal.
- Profil tetamu: kad akses akaun dipadatkan dengan penerangan fungsi dan tindakan log masuk, daftar serta terus sebagai tetamu. Ini bukan reka bentuk baharu untuk tab profil ahli.
- UserProfileDashboard.tsx dan semua fail src/components/profile dibandingkan secara bait dengan baseline terdahulu: tidak diubah. Listener akaun, pengalihan admin, props embedded dan tindakan tempahan semula pada Profil dikekalkan.
- Tiada gambar landing, menu atau splash disunting. Tiada dependency, versi, konfigurasi Android atau kod backend diubah.

## CONFIRMED: pembaikan aliran Jadual
1. Butang Tempah untuk tarikh ini sebelum ini menghantar query date yang tidak dibaca oleh OrderPage/OrderForm. Ia kini menggunakan state pengisian awal sedia ada (reorderData: { date }). Borang bermula pada langkah pertama dengan tarikh dipilih; draf sedia ada tidak dipadam. Aliran ini diperiksa hingga medan tarikh pada langkah ketiga, tanpa menghantar tempahan.
2. Pembacaan jadual kini menyemak status HTTP dan jawapan API, memaparkan ralat yang jelas serta butang Cuba lagi. Apabila bacaan gagal, bahagian tarikh tidak mendakwa tiada tempahan. Data terdahulu tidak dipadam ketika kegagalan. Permintaan yang dibatalkan tidak menulis state selepas cleanup.

## Pemasangan
Gabungkan fail ZIP mengikut path asal pada akar projek. Tambah src/pages/customer-calendar-profile.css, gantikan CalendarPage.tsx dan ProfilePage.tsx, serta tambah ujian regresi dan laporan ini. Tiada fail perlu dipadam.

Patch ini menyambung Wawasan-pembaikan-audit-uiux.zip dan Wawasan-Tempah-Tetapan-selaras.zip. Gunakan selepas kedua-duanya kerana CalendarPage menggunakan OrderStatusBadge daripada patch audit dan kedua-dua halaman menggunakan CustomerPageHeader daripada patch Tempah/Tetapan. Ia bukan salinan keseluruhan repo.

Build semula melalui aliran APK sedia ada untuk melihat kemasan pada aplikasi Android yang dipasang.

## CONFIRMED: verifikasi
- npm run lint: PASS.
- npm run test -- --maxWorkers=1: 27 fail, 265 ujian unit PASS pada baseline gabungan patch terdahulu.
- tsc --noEmit -p tsconfig.app.json: PASS.
- npm run build: PASS, termasuk Vite dan bundle server esbuild.
- e2e/calendar-flow.spec.ts: 6 ujian Playwright PASS (dua tema; ralat/cuba lagi, destinasi Utama/Kembali dan tarikh Jadual dibawa ke medan tarikh borang). Dijalankan terhadap build statik di pelayan tempatan, dengan konfigurasi ujian sementara menunjuk kepadanya dan Chromium sistem. Konfigurasi sementara tidak dimasukkan dalam patch. Fail ujian mengikuti pola e2e repo dan boleh dijalankan dengan npm run test:e2e -- e2e/calendar-flow.spec.ts selepas setup Playwright biasa.
- Semakan Chromium tambahan: Jadual, Profil tetamu, Tempah dan Tetapan pada 320, 390, 768, 1280 px dalam dua tema. Pengepala sejajar; tiada limpahan mendatar; fon jenama asal dimuatkan; kawasan butang pengepala minimum 44px, mengambil kira pembundaran geometri pelayar.
- Semakan interaksi: bulan sebelumnya/seterusnya, pilih tarikh, Hari Ini, dialog tindakan, Escape/pemulihan fokus, dialog log masuk/daftar, laluan tempahan tetamu dan tarikh borang. PASS.
- JavaScript page errors: 0. Tiada tempahan dihantar atau akaun sebenar digunakan. Respons API kosong dan ralat 503 disimulasikan; permintaan luaran disekat. Ini semakan UI/regresi, bukan pengesahan data langsung.
- Screenshot build sebenar mod cerah/gelap diperiksa secara visual. git diff --check: PASS.

## Rujukan / batas
Kemasan meneruskan prototaip Tempah/Tetapan yang telah diluluskan pemilik, panduan jenama repo serta panduan peranan komponen Android yang telah dirujuk: https://developer.android.com/design/ui/mobile/guides/components/material-overview . Tiada dakwaan carian trend atau rujukan visual baharu dibuat untuk sambungan ini. Komponen UI kit tidak diubah.

UNKNOWN: ujian APK/peranti fizikal, data sebenar dan sesi ahli/admin sebenar belum disahkan. Backend tidak diubah. Ketahanan sambungan Firestore langsung dan keseluruhan proses hantar tempahan bukan skop verifikasi visual ini.
