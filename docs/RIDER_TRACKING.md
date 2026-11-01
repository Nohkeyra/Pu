# Penjejakan lokasi rider — Restoran Wawasan

Tarikh: 2026-11-01. Asas GitHub: `7834e9539a8cd513a71e66cce4f60d4c45558a13` (1.3.158 / 290).

## Hasil perubahan

- Peta telefon dengan panel ringkasan di bawah; panel bersebelahan pada skrin besar. Tema cerah/gelap, BM/English, kawalan minimum 44 px, fokus papan kekunci dan Escape menggunakan dialog sedia ada.
- Rider/admin: Admin → Orders → butiran pesanan → **Jejak penghantaran** → **Mula kongsi lokasi**. Pesanan `in_transit` kini boleh membuka semula peta. Telefon, navigasi, pengesahan serahan dan draf WhatsApp berhampiran destinasi kekal tindakan manual.
- Pelanggan: Profil → Tempahan → **Jejak Penghantaran** untuk pesanan sendiri. Tiada kawalan siaran atau permintaan GPS pelanggan.
- Tiada simulasi pergerakan dalam kod produksi. Penanda rider hanya muncul daripada koordinat GPS yang diterima API. Lokasi terakhir berwarna kelabu; ia tidak digerakkan secara automatik di sepanjang laluan.
- Lokasi dinilai semula setiap dua saat. Label Langsung memerlukan sumber GPS, padanan sesi aktif, koordinat sah, ketepatan sehingga 100 m, bacaan dan penerimaan server dalam 30 saat, serta sambungan pembaca yang berjaya. Paparan menyemak API kira-kira setiap lima saat tanpa cache; ini kemas kini berkala, bukan WebSocket.
- Satu pesanan aktif untuk rider pada satu masa. Mula untuk pesanan lain menamatkan sesi sebelumnya. Sesi mempunyai had empat jam dan juga boleh tamat lebih awal apabila log masuk/kebenaran tamat atau pesanan ditutup.
- API mula/siaran memerlukan token admin. API bacaan memerlukan pemilik pesanan atau admin. Urutan mesej dan ID sesi menghalang koordinat/henti lewat daripada menimpa sesi baharu. Firestore rules menghalang penulisan terus medan telemetri oleh SDK klien.
- Kemas kini koordinat tidak mengubah `updatedAt` rekod perniagaan. Geofence berlepas 100 m hanya menggunakan GPS yang diterima server; perubahan status mengekalkan saluran notifikasi dan penyegerakan kalendar sedia ada.

## Android dan web

Android menggunakan plugin dalaman `RiderTracking` dan `RiderLocationService` berjenis foreground location. Ia dimulakan oleh rider ketika app kelihatan selepas kebenaran lokasi tepat dan notifikasi diberikan. Notifikasi berterusan mempunyai tindakan henti dan pintasan ke pesanan aktif. Menutup peta tidak menamatkan servis Android. Henti, log keluar, kegagalan pengesahan, sesi diganti dan pesanan ditutup menghentikannya. Servis turut menyemak sesi ketika tiada GPS yang sesuai. Tiada auto-start selepas boot atau sticky restart, dan tiada permintaan ACCESS_BACKGROUND_LOCATION.

Token menggunakan storan terenkripsi native yang sudah tersedia. Token/koordinat tidak dimasukkan dalam log atau notifikasi. URL API native ditentukan ketika binaan (`-PriderApiBaseUrl=https://...`); lalai ialah backend Render projek. Native hanya menerima HTTPS dan tidak mengikuti redirect untuk permintaan bertoken. Jika anda menukar domain backend, padankan konfigurasi web dan property native ini.

Web menggunakan `watchPosition` hanya selepas Mula. Henti, tutup peta atau pagehide membersihkan watcher. Pembatalan ketika permintaan mula sedang berjalan turut dibersihkan. Web tidak menjanjikan GPS apabila halaman ditutup atau digantung. Kegagalan menghantar mesej henti tidak menghasilkan koordinat baharu; paparan pelanggan beralih kepada lokasi terakhir apabila had kesegaran tamat.

## Peta

OpenStreetMap, Nominatim dan OSRM yang sudah digunakan projek dikekalkan. URL jubin dibetulkan kepada endpoint rasmi tunggal dan atribusi dipaparkan. WebView mengenalkan app dalam User-Agent. Tiada muat turun kawasan luar talian. Destinasi hasil carian alamat dilabel sebagai anggaran; alamat gagal tidak diganti dengan koordinat rekaan. Jarak yang dipaparkan ialah jarak terus, bukan jarak jalan. Jika jubin/laluan/carian alamat gagal, status GPS masih boleh digunakan dan terdapat kawalan cuba semula. Provider awam ini mempunyai ketersediaan best-effort; tiada jaminan perkhidmatan produksi khusus. Alamat carian dan koordinat laluan dihantar kepada provider peta berkenaan seperti aliran peta yang sedia ada.

## Memasang patch

1. Salin fail ZIP mengikut laluan asal ke repo terkini. ZIP mengandungi fail berubah/ditambah sahaja, bukan keseluruhan projek. Ia turut menyertakan `presentation.css` yang diperlukan oleh import AdminPanel; aset jenama, fon asal jenama, gambar landing, gambar menu dan splash tidak diubah.
2. Jalankan `npm run lint`, `npm run test`, `npm run typecheck` dan `npm run build`.
3. Terbitkan backend yang menyertakan `server/routes/riderRoutes.ts` dan kemas kini Firestore rules dalam projek Firebase yang sama. Web dan native perlu menggunakan backend/Firebase yang sama.
4. Jalankan `npx cap sync android` selepas build web, menggunakan konfigurasi Firebase sebenar projek. Bina APK baharu melalui aliran binaan projek. Plugin/manifest native tidak boleh ditambah melalui kemas kini aset web sahaja. APK lama akan memaparkan arahan memasang APK baharu apabila plugin tiada.
5. Pasang APK pada telefon rider dan uji dengan satu pesanan ujian milik akaun pelanggan ujian. Jangan anggap ujian kompilasi sebagai pengesahan GPS fizikal.

## Bukti dan had pengesahan

CONFIRMED:
- Lint dan TypeScript frontend/server lulus.
- 297 ujian dalam 30 fail ujian lulus. Suite unit/API menggunakan Firestore dalam memori: pengesahan admin, pemilikan pesanan, kesegaran/ketepatan, sesi diganti/ditamatkan, urutan mesej, GPS ditolak, rangkaian gagal, kebenaran ditolak dan batal ketika mula. Semua notifikasi luaran dimock dalam ujian.
- Build Vite + esbuild berjaya.
- Kompilasi Java/Kotlin debug Android berjaya dengan JDK 21 dan SDK 36. Konfigurasi Firebase sintetik digunakan untuk kompilasi kerana `google-services.json` produksi tidak berada dalam repo. Konfigurasi sintetik, SDK/JDK/cache dan fail binaan tidak disertakan dalam patch. Tiada APK produksi dibina atau diterbitkan.
- Semakan Chromium pada 320/390/768/1280 px, cerah/gelap, BM/English, mula/henti/tutup/buka semula, GPS lama, offline dan akses ditolak. Komponen dan endpoint sebenar digunakan dengan pesanan/GPS simulasi dan Firestore dalam memori. Pratonton dilabel simulasi.
- Gradle wrapper asal dalam repo rosak. Ia diganti dengan JAR rasmi Gradle 8.11.1; SHA-256 disahkan terhadap checksum rasmi distribusi.

UNKNOWN / NOT RUN:
- GPS telefon Android sebenar ketika skrin dipadam, pertukaran app, kawalan notifikasi, runtime permission dan sekatan bateri pengeluar belum diuji pada peranti fizikal.
- Backend/Firebase produksi, akaun sebenar dan penghantaran sebenar tidak disentuh. Tiada deployment atau mesej pelanggan dilakukan.
- Dokumen tambahan yang dinamakan AGENTS.md (security/design/build specs) tidak tersedia dalam checkout; tiada keputusan ujian atau polisi direka berdasarkan fail yang tiada itu.

Status pengesahan keseluruhan: **PARTIAL** — kod dan semakan tempatan selesai; pengesahan pada APK/peranti fizikal serta deployment masih diperlukan.

## Rujukan rasmi

- Android foreground location service: https://developer.android.com/develop/background-work/services/fgs/service-types#location
- Android batas memulakan foreground service: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- Android location permissions: https://developer.android.com/develop/sensors-and-location/location/permissions
- Capacitor plugin Android: https://capacitorjs.com/docs/plugins/android
- Material map/detail-sheet pattern: https://m1.material.io/components/bottom-sheets.html
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/
- Gradle wrapper checksum: https://services.gradle.org/distributions/gradle-8.11.1-wrapper.jar.sha256
