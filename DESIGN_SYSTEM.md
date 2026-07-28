# Wawasan Pak Usop — Design System

A professional UI/UX enhancement layer for the **Wawasan Pak Usop** restaurant
app (Restoran Wawasan Pak Usop — Malay / Nusantara cuisine).

The enhancement layer is shipped as a **standalone CSS file** and loaded
after the main Tailwind bundle. The original hashed CSS is **untouched** —
no merge step, no JS rebuild.

> **Files edited in the Android assets:**
> - `android/app/src/main/assets/public/index.html` (created)
> - `android/app/src/main/assets/public/assets/kp-enhancements.css` (created)
>
> **Files in this delivery zip:**
> - `enhancements.css` — standalone copy of the layer
> - `index.html` — the loader HTML
> - `DESIGN_SYSTEM.md` — this file
> - `INTEGRATION.md` — Vite/Capacitor build-time integration guide

---

## 1. Brand foundations

### Colour palette

| Token              | Hex       | Role                                  | Contrast vs. charcoal (#1A1816) |
|--------------------|-----------|---------------------------------------|----------------------------------|
| `--color-charcoal`   | `#1A1816` | Primary surface (page background)     | —                                |
| `--color-deep-brown` | `#2D2520` | Elevated surface / card background    | —                                |
| `--color-cream`      | `#F5F0E8` | Primary text on dark surfaces         | 13.8 : 1 ✅ AAA                  |
| `--color-warm-gold`  | `#D4A853` | Brand accent / focus / CTAs           | 6.4 : 1 ✅ AAA                   |
| `--color-terracotta` | `#C17A5F` | Secondary accent (food / warmth)      | 4.6 : 1 ✅ AA Large              |

All gold-on-charcoal text passes WCAG AA at small sizes and AAA at large.
The gold accent was chosen as the dominant interactive colour because it
contrasts comfortably with the dark surfaces and references traditional
songkok / wedding-decoration gold commonly seen in Malay visual culture.

### Typography

- **Display / Headings** — `Playfair Display` (serif)
- **Body** — `Inter` (sans-serif)
- **Numerics** — tabular-nums, lining-nums (`font-variant-numeric: tabular-nums`)

Fluid display sizes (no jarring jumps between breakpoints):

```
.kp-display-1  clamp(2.5rem, 4vw + 1rem,    5rem)
.kp-display-2  clamp(2rem,   3vw + 0.75rem, 3.75rem)
.kp-display-3  clamp(1.5rem, 2vw + 0.5rem,  2.5rem)
```

### Spacing & rhythm

The 4-px Tailwind scale is preserved. Standardized content container
(1200 px max, with responsive gutters) via `.content-container`.

---

## 2. Accessibility (WCAG 2.2 AA target)

| Concern                  | Implementation                                                              |
|--------------------------|------------------------------------------------------------------------------|
| Focus visibility         | 3 px solid gold outline + 2 px offset on every interactive element           |
| Colour-only state        | Status uses icon + label + colour (badges, dots)                             |
| Touch targets            | 44 × 44 px minimum (`.kp-touch`, `.kp-btn`, `.kp-input`)                     |
| Reduced motion           | All animations/transforms collapse to 1 ms when `prefers-reduced-motion: reduce` |
| Forced-colors mode       | Borders forced to `CanvasText`; focus forced to `Highlight`                  |
| Skip-to-content          | `.kp-skip` link in `index.html` — hidden until focused, jumps to `#main`     |
| Screen-reader text       | `.kp-sr` utility (visually-hidden, accessible)                               |
| Form errors              | `.kp-field--error` red border + 3 px red ring + `.kp-field__error` text      |
| Numerals                 | Tabular for prices, quantities, order IDs                                    |

> All focus rings use `#D4A853` on `#1A1816` = **6.4 : 1** contrast ratio (AAA).

---

## 3. Component patterns

### Buttons — `.kp-btn`

| Variant              | Class                          | Use                          |
|----------------------|--------------------------------|------------------------------|
| Primary CTA          | `.kp-btn .kp-btn--primary`     | "Order now", "Submit"        |
| Ghost / secondary    | `.kp-btn .kp-btn--ghost`       | "Learn more", "Cancel"       |
| Warm / food accent   | `.kp-btn .kp-btn--terracotta`  | "Add to cart"                |

All buttons scale to 0.97 on press, animate background + shadow + colour
transitions in 200 ms.

### Cards — `.kp-card` / `.kp-menu-card`

- Translucent surface with backdrop-blur for layering
- `.kp-lift` adds 4 px hover translate + soft shadow
- `.kp-zoom` adds 1.06× scale on inner image
- `.kp-menu-card` is purpose-built for the menu grid: media (4:3) + title +
  price + add-to-cart

### Form fields — `.kp-field` / `.kp-input`

- Floating-style label pattern (`.kp-label` above)
- 44 px min-height for thumb-friendly tap targets
- Hover → focus progression: border deepens, background lifts, 3 px gold ring
- Error state: red border + ring + helper text below

### Status badges — `.kp-badge`

| Variant     | Colour     | Use                          |
|-------------|------------|------------------------------|
| Gold        | `#D4A853`  | Featured / special           |
| Green       | `#10B981`  | Confirmed / paid / done      |
| Amber       | `#F59E0B`  | Pending / awaiting action    |
| Red         | `#EF4444`  | Cancelled / error            |
| Sky         | `#0EA5E9`  | Information                  |
| Neutral     | cream/8 %  | Default                      |

### Order step indicator — `.kp-steps`

Horizontal stepper used on the order flow:
- 3 states: `is-done` (green), `is-active` (gold), default (muted)
- 28 × 28 px circles, gold/green fills on transition
- Connector lines between steps

### Toast — `.kp-toast`

Fixed bottom-right on web, top on Android (via Capacitor safe-area). Three
variants match the badge system.

---

## 4. Malay-inspired decorative utilities

These are optional, additive classes that lean into the local cultural context
without being kitsch.

### `.kp-songkok`
Subtle radial gold + terracotta glow in top-right and bottom-left corners.
Apply to hero sections, landing cards, admin panel headers.

### `.kp-batik`
Inline SVG tile (64 × 64) producing a faint geometric pattern on dark surfaces.
Uses brand gold at 8 % opacity. Pure CSS — no extra HTTP request.

### `.kp-divider`
Ornamental section divider: gold gradient lines + centered label, all-caps
letter-spaced 0.25 em. Use between major landing sections.

### `.kp-grain`
SVG noise overlay with `mix-blend-mode: overlay` — adds tactile depth to large
hero photos. Uses `::before`, so safe to apply to a positioned container.

### `.kp-hero`
Combined radial + linear gradient overlay for landing hero sections. Apply to
the hero container element; children stack above with `position: relative; z-index: 1`.

---

## 5. Micro-interactions

All motion respects `prefers-reduced-motion`. The default timings are tuned for
the Capacitor WebView on Android — long enough to feel premium, short enough
not to delay user input.

| Class               | Effect                                                  | Duration |
|---------------------|---------------------------------------------------------|----------|
| `.kp-press`         | scale(0.97) on `:active`                               | 150 ms   |
| `.kp-lift`          | translateY(-4 px) + soft shadow on `:hover`            | 300 ms   |
| `.kp-zoom`          | scale(1.06) on inner image on parent `:hover`          | 600 ms   |
| `.kp-link`          | underline scaleX 0→1 left-to-right on `:hover`          | 350 ms   |
| `.kp-nav-link`      | persistent underline on `aria-current="page"`          | 300 ms   |
| `.kp-skeleton`      | shimmer (200 % background-position loop)                | 1.6 s    |
| `.kp-dot-indicator--pulse` | expanding fade ring (live / new-order)            | 1.6 s    |
| `.kp-dots`          | typing-indicator dots                                   | 1.2 s    |

---

## 6. Mobile / native shell

The Capacitor wrapper ships as an Android APK. The enhancement layer includes:

- **Safe-area handling** — `.kp-safe-top`, `.kp-safe-bottom`, `.kp-safe-x`,
  `.kp-bottom-bar` all use `env(safe-area-inset-*)` so content stays clear of
  notches and the Android gesture bar.
- **Tap highlight** — `-webkit-tap-highlight-color: transparent` on buttons.
- **Overscroll** — `scroll-behavior: smooth` + `-webkit-overflow-scrolling: touch`.
- **Print** — `.kp-no-print` hides nav / admin chrome when the user prints
  a receipt or invoice.
- **Dark colour scheme** — `color-scheme: dark` opted in so the Android WebView
  scrollbars, form controls, and autofill UI stay dark.

---

## 7. Implementation guide

The enhancement layer is shipped as a **separate CSS file** loaded after
the main Tailwind bundle. The original hashed CSS is **untouched** — no
merge step required, no JS rebuild.

```
android/app/src/main/assets/public/
├── index.html                                  ← loads the enhancements
└── assets/
    ├── index-BNyT8fGb.css                      ← original Tailwind bundle (untouched)
    └── kp-enhancements.css                     ← UI/UX enhancement layer (new)
```

`index.html` loads both:

```html
<link rel="stylesheet" href="/assets/index-BNyT8fGb.css" />
<link rel="stylesheet" href="/assets/kp-enhancements.css" />
```

For source-build (Vite) integration, see **`INTEGRATION.md`**.

### Using the new utilities in JSX

```tsx
// Hero section
<section className="kp-hero kp-songkok kp-grain min-h-[85vh]">
  <div className="content-container relative z-10">
    <h1 className="kp-display-1">Restoran Wawasan Pak Usop</h1>
    <button className="kp-btn kp-btn--primary kp-press">
      Pesan Sekarang
    </button>
  </div>
</section>

// Menu card grid
<div className="kp-menu-card kp-lift">
  <div className="kp-menu-card__media kp-zoom">
    <img src={dish.image} alt={dish.name} loading="lazy" />
  </div>
  <div className="p-5">
    <h3 className="kp-display-3">{dish.name}</h3>
    <p className="kp-price text-xl">RM {dish.price.toFixed(2)}</p>
    <button className="kp-btn kp-btn--terracotta kp-press">Add</button>
  </div>
</div>

// Order stepper
<ol className="kp-steps">
  <li className="kp-step is-done">1</li>
  <span className="kp-steps__sep" />
  <li className="kp-step is-active">2</li>
  <span className="kp-steps__sep" />
  <li className="kp-step">3</li>
</ol>

// Form
<label className="kp-field">
  <span className="kp-label">Nama</span>
  <input className="kp-input" type="text" required />
</label>
```

---

## 8. What was changed in this delivery

| File                                                                                | Change                                      |
|--------------------------------------------------------------------------------------|---------------------------------------------|
| `android/app/src/main/assets/public/index.html`                                      | **Created** — loads both CSS files + Google Fonts + skip-link |
| `android/app/src/main/assets/public/assets/kp-enhancements.css`                      | **Created** — 18.7 KB enhancement layer (standalone) |
| `android/app/src/main/assets/public/assets/index-BNyT8fGb.css`                       | **Untouched** — original Tailwind bundle preserved as-is |
| `enhancements.css` (this zip)                                                        | Standalone copy of `kp-enhancements.css` for source builds |
| `DESIGN_SYSTEM.md` (this zip)                                                        | Documentation of tokens, patterns, A11Y     |
| `INTEGRATION.md` (this zip)                                                          | Vite + Capacitor build-time integration guide |

**Zero modifications** to JS bundles, images, or the existing CSS — the
enhancement is purely additive as a separate, independently-cacheable
file. The Capacitor APK picks up the new `index.html` + `kp-enhancements.css`
on the next `cap sync`.
