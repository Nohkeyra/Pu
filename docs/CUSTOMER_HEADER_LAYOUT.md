# Tempah & Tetapan — susunan UI/UX yang diluluskan

Asas: Nohkeyra/Pu main `50a3aac28176bf86aa5a15c9812aec80bda520bf`, versi 1.3.157 (289), dengan pembaikan audit terdahulu sebagai baseline tempatan.
Tarikh: 1 November 2026.

## Hasil / status
PARTIAL — pelaksanaan dan semakan web selesai. APK/peranti fizikal belum diuji. Tiada dakwaan bahawa perubahan sudah dideploy atau dipasang pada APK pengguna.

## CONFIRMED: perubahan
- Satu pengepala bersama untuk Tempah dan Tetapan: logo/nama asal, suis tema, butang kembali, tajuk halaman dan menu tindakan.
- Font jenama `font-artistic` / Uncial Antiqua dikekalkan. Fail logo tidak disunting.
- Kemajuan Tempah dipadatkan; draf, padam draf, demo, log masuk dan daftar kekal tersedia. Kad pilihan, bilangan tetamu dan bar tindakan menggunakan susunan baharu.
- Kuantiti diletakkan sebelum gaya sajian dalam DOM dan paparan supaya urutan papan kekunci mengikuti rupa halaman.
- Tetapan mengutamakan Akaun, Paparan/Bahasa dan Notifikasi; semua bahagian lanjutan, kawalan admin, dialog dan callback asal dikekalkan. Kad kawalan admin dialihkan ke bahagian bawah.
- CSS disekat pada dua halaman ini. Pengepala diukur dengan ResizeObserver border-box supaya perubahan inset sistem dan saiz teks mendapat ruang yang betul.
- Suis menggunakan kawasan sentuh 48 × 44 px dengan trek 40 × 24 px; pelaras saiz tulisan mempunyai trek yang jelas.
- Tiada dependency baharu, perubahan backend, versi, gambar menu, gambar landing atau splash. Navigasi bawah menggunakan komponen sedia ada.

## Pemasangan
ZIP ini mengandungi enam fail kod/CSS serta laporan ini, dengan path asal repo. Gabungkan pada akar projek, tambah dua fail komponen baharu dan gantikan empat fail sedia ada. Tiada fail perlu dipadam. Jangan gantikan keseluruhan repo dengan kandungan patch sahaja.

Gunakan bersama patch pembaikan audit yang telah dihantar sebelum ini (`Wawasan-pembaikan-audit-uiux.zip`), termasuk fon tempatan untuk paparan luar talian. Fail Tetapan dalam patch baharu mengekalkan pembaikan audit pada fail yang sama. Fail audit lain tidak disertakan semula.

Jalankan semakan projek dan build semula APK melalui aliran build sedia ada untuk melihat perubahan dalam aplikasi Android yang dipasang. Patch ini tidak mengandungi APK atau output build.

## CONFIRMED: verifikasi
- `npm run lint`: PASS.
- `npm run test -- --maxWorkers=1`: 27 fail ujian, 265 ujian PASS pada tree yang turut mengandungi patch audit terdahulu.
- `tsc --noEmit -p tsconfig.app.json`: PASS.
- `npm run build`: PASS (klien Vite dan bundle server esbuild).
- `git diff --check`: PASS.
- Chromium terhadap build sebenar: lebar 320, 390, 768, 1280 px; mod cerah dan gelap. Tiada limpahan mendatar; saiz/susunan pengepala sama antara dua halaman; font asal dimuatkan; butang pengepala minimum 44 × 44 px; bar tindakan tidak menindih navigasi bawah.
- Dialog tindakan, Escape/pemulihan fokus, dialog FAQ, BM/EN, tema, saiz tulisan 20px, suis notifikasi, simulasi inset 24px serta validasi dan aliran Tempah langkah 1 → 2 → 3: PASS. Tiada tempahan dihantar.
- JavaScript page errors: 0. Permintaan API tulis: 0. Permintaan luaran disekat; jawapan API GET disimulasikan untuk semakan UI sahaja. Ini bukan pengesahan backend atau data langsung.
- Semakan visual screenshot Chromium dilakukan untuk kedua-dua tema; isu trek slider, bentuk suis dan ruang inset dibetulkan dan diperiksa semula.

## Rujukan
Arah visual diluluskan pengguna melalui prototaip Tempah/Tetapan. Asas komponen: https://developer.android.com/design/ui/mobile/guides/components/material-overview dan corak React/UI sedia ada dalam repo. Panduan jenama daripada AGENTS.md, SKILL.md dan README digunakan. `docs/DESIGN_SYSTEM_SKILL.md` yang disebut AGENTS.md tidak ditemui selepas carian workspace; komponen UI kit sedia ada tidak diubah untuk kerja ini.

## UNKNOWN / baki verifikasi
APK fizikal, papan kekunci Android sebenar dan inset native sebenar belum diuji. Simulasi inset CSS bukan bukti ujian peranti. Ujian API/backend langsung dan proses hantar tempahan tidak dijalankan dalam semakan visual ini. Tiada perubahan server dibuat.
