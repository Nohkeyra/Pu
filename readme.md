# Restoran Wawasan Design System

Design System and Component Specification for **Restoran Wawasan Pak Usop** web & mobile applications.

## 1. Tentang Projek
Sistem reka bentuk (Design System) yang memacu antaramuka konsisten, mesra-pengguna, dan berprestasi tinggi untuk sistem pesanan, invois, dan pentadbiran Restoran Wawasan Pak Usop.

- **Stack**: React 18, Vite, Tailwind CSS, Lucide Icons, shadcn/ui primitives.
- **Specs & Rujukan**:
  - `docs/DESIGN_SYSTEM_SKILL.md` (Spesifikasi compiler & komponen)
  - `docs/INVOICE_SPECS.md` (Spesifikasi invois & PDF)
  - `docs/SECURITY_SPEC.md` (Spesifikasi keselamatan & auth)

---

## 2. Content Fundamentals
Berdasarkan kod sedia ada:
- **Bahasa**: Bahasa Melayu (lalai/primary) & Bahasa Inggeris (dwibahasa melalui `useLanguage`).
- **Tone**: Mesra, profesional, berorientasikan hidangan warisan katering Melayu asli.
- **Casing**: Sentence case untuk deskripsi/input; Title Case / Uppercase berjarak (`tracking-widest` / `tracking-[0.16em]`) untuk label mikrokopi & lencana status.
- **I vs You**: Menggunakan pendekatan mesra pihak restoran ("Kami", "Restoran Wawasan") & memanggil pelanggan secara hormat ("Anda", "Pelanggan").
- **Penggunaan Ikon/Emoji**: Mengutamakan ikon vektor Lucide (1.5px / 2px stroke); mengelakkan emoji raw dalam komponen antaramuka teras.

---

## 3. Visual Foundations

### A. Colors
- **Accent (Gold / Sunshine)**: `#C2932D` (`var(--color-sunshine-cta)` / `var(--color-accent)` - dinamik mengikut tema kustom)
- **Primary / Deep Forest**: `#0C453C`
- **Dark Neutral (Charcoal)**: `#1A1816`
- **Light Neutral (Cream / Surface)**: `#FAF7F1` (`#FAF8F5`)
- **Borders**: `#E8E2D6` / `#D4CCBC` (Dark: `rgba(255,255,255,0.08)`)

### B. Typography
- **Primary Font Family**: Plus Jakarta Sans, sans-serif
- **Display Font**: Playfair Display / Plus Jakarta Sans Display (untuk tajuk utama dan penekanan premium)
- **Type Scale**:
  - `text-xs` (12px) — Had minimum kebolehbacaan (tiada arbitrary < 12px)
  - `text-sm` (14px) — Teks sekunder, label butang padat
  - `text-base` (16px) — Teks badan standard
  - `text-lg` (18px) / `text-xl` (20px) — Subtajuk
  - `text-2xl` - `text-4xl` — Tajuk skrin & display hero

### C. Spacing & Grid Scale
Semua ruang mengikut sistem 4pt Tailwind:
- `4px` (`1` / `0.25rem`)
- `8px` (`2` / `0.5rem`)
- `12px` (`3` / `0.75rem`)
- `16px` (`4` / `1rem`)
- `24px` (`6` / `1.5rem`)
- `32px` (`8` / `2rem`)

### D. Corner Radii
- **Buttons / Controls**: `rounded-md` (6px) / `rounded-lg` (8px)
- **Cards / Containers**: `rounded-lg` (8px) / `rounded-xl` (12px)
- **Dialogs / Modals**: `rounded-xl` (12px)
- **Pills / Status Badges**: `rounded-full` (9999px)

### E. Shadows
- Menggunakan bayang-bayang neutral standard: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`.
- Tiada glow berwarna buatan (*anti-slop*).

### F. Iconography
- Menggunakan ikon rasmi dari `lucide-react`.
- Stroke width: `1.5px` (standard) atau `2px` (butang aksi utama).

---

## 4. Index & Manifest
- `styles.css`: Entry point import CSS (`@import "tokens/colors.css";` dsb.)
- `tokens/`: Token definisi warna, tipografi, dan ruang
- `src/components/ui/`: Komponen UI asas (Button, Card, Chip, SegmentedControl, ColorSwatch, Input, Select, Dialog, dsb.)
- `guidelines/`: Kad spesimen visual asas (Colors, Typography, Spacing, Radius, Shadows, Icons, Brand, Forms, Modals, Chips, Lists, Stats, Banners)
- `ui_kits/`: Replikasi antaramuka skrin sebenar (`order-screen/`, `invoice-screen/`)
- `assets/`: Aset grafik dan visual jenama

---

## 5. Nota Tambahan & Intentional Decisions
- **Font Substitution**: Menggunakan fallback sistem selamat (`system-ui`, `sans-serif`) sekiranya web font sedang dimuat.
- **Logo**: Nama jenama dirender secara tipografi tulen berbanding grafik statik untuk menjamin skalabiliti responsif.
- **Custom Theme Engine**: Warna aksen diselaraskan secara langsung melalui `SettingsContext` dan pembolehubah CSS `--color-sunshine-cta`.

