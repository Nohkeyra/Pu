# Wawasan visual architecture (v1.3.175)

## Ownership: edit existing rules, do not add a newer override

| Responsibility | Owner | Other files |
|---|---|---|
| Semantic/brand token values | `tokens/colors.css` and `src/index.css` (`:root`/`.dark`) | Do not redefine token values inside a page for app-wide effects. |
| Radius/shadow scales | `tokens/radius.css`, `tokens/shadows.css`, and active overrides in `src/index.css` | Keep intentional page-specific component values scoped to the component. |
| Tailwind utility *exposure* | `src/index.css` `@theme` | Every utility alias must reference an independent `--wawasan-source-*` property, never itself. |
| Customer ambient batik (full-page) | `src/wawasan-page-backgrounds.css` | Do not recreate `.customer-page::before` elsewhere. |
| Order page floral positions | `src/components/customer-pages.css` | Edit the existing desktop/mobile rules; do not add V8/V9 overrides. |
| Calendar/Profile/Settings ambient florals | `src/wawasan-page-backgrounds.css` | Kept behind foreground content. |
| Theme/light-dark sync | `src/context/ThemeContext.tsx` | Firestore branding accent remains authoritative by current product design. |
| Landing base styles | `src/pages/landing-page.css` | `heritage-hero.css` is intentionally more specific for the current hero. |
| Current heritage hero visuals | `src/pages/heritage-hero.css` | Do not add another hero overlay stylesheet. |

### Token rule

Tailwind v4 emits the `@theme` custom properties. Reusing the exact same custom property in its own value (`--color-foo: var(--color-foo)`) creates a circular reference and can invalidate the computed value. Use an independent source variable instead:

```css
/* Active palette in :root/.dark */
--wawasan-source-color-surface: hsl(var(--card));
--color-surface: var(--wawasan-source-color-surface); /* compatibility for direct CSS users */

/* Tailwind utilities */
@theme {
  --color-surface: var(--wawasan-source-color-surface);
}
```

To change a token, edit the **source value**, not the Tailwind exposure mapping. Source variables are also updated in `.dark` for theme-specific colors. Existing visual values are retained in this refactor.

### Before changing UI

1. Search for the selector across `src/**/*.css`, JSX and TSX, and check actual DOM classes.
2. Identify the owner in the table above, then modify **that existing rule**.
3. Add a media or state variant only when intentional; remove obsolete variants after comparing the resulting styles.
4. Run `npm run lint:visual`, project lint/build and screenshot comparisons in supported environments.
5. Compare viewport widths 320/360/390/768/1024 px in light/dark, including safe areas and reduced motion.

`lint:visual` is a **static architecture check**, not a replacement for a browser, Android WebView, accessibility or visual regression suite.


## Current presentation owners

The superseded `wawasan-editorial-v2.css`, `wawasan-creative-v6.css` and
`pages/living-canvas-v31.css` are removed. Their active responsibilities now live
in the page/component owners, rather than in successive global overrides.

- `wawasan-refinement-v5.css`: portal elevations, shared sizing variables, toasts,
  and APK footer reservation only.
- `components/customer-pages.css`: shared customer header, forms, settings and
  native density; `pages/customer-calendar-profile.css`: calendar and profile access.
- `pages/heritage-hero.css`: one hero composition for web and APK. The landing page
  intentionally scrolls; compact native sizing applies to the operational pages.
- `pages/customer-dashboard.css`, `pages/login-page.css`: dashboard and access screens.
- `components/admin/admin-panel.css`, `components/profile/profile-dashboard.css`,
  `components/layout/bottom-navigation-polish.css`: their respective feature chrome.
- `styles/living-canvas-order.css`: state-driven order illustration, including its
  native variant. `wawasan-four-colour-theme.css` only adapts palette and shared states.

The order wizard now uses each step's existing progression action. The repeated
progression control inside the supporting quote panel is removed. Validation,
submission handlers and stored data are unchanged.

`e2e/platform-restyle.spec.ts` exercises both themes, desktop/mobile web and the
native presentation marker at compact, phone and landscape viewports. This
browser emulation does not verify a physical Android WebView or native plugins.

The shared customer header centers the brand text between equal-width side slots.
The existing Back action is visible on the left beside the logo; its destination
continues to come from the page. Home can omit Back. The original wordmark font
is retained, and narrow screens allow wrapping without truncating the name.

`components/brand/KraftLunchboxArtwork.tsx` owns the carton illustration shared
by the landing hero, order preview, login and customer dashboard. All four
consumers render the component directly. The superseded public lunchbox SVG and
inline order drawing are removed. The rear hinge, opening, closed lid and front
wall use the same corners. Ingredients stay seated as the wizard advances;
existing preview state controls the open/closed layers. Each rendered SVG uses
unique definition IDs, so multiple scenes cannot share the wrong gradient.

`components/order/OrderPreviewProgress.tsx` owns the shared preview state and
derives its labels, pax and serving style from OrderForm. Its initial scene
scrolls normally; the existing progress navigation stays below the measured
header and becomes a compact preview after the scene leaves view. Its actions
remain available through the progress menu. The existing keyboard hook reduces
the mini preview to a text row, and the form focus guard checks the actual
header/progress heights. The desktop summary also reserves the measured progress
height to stay clear of the sticky bar. The existing Dialog primitive supplies the bottom
preview sheet, focus trap, Escape handling and return focus. No extra native
permission or animation dependency is required. The order route uses
`overflow-x: clip` on its outer shell so it does not create an intermediate
scroll container that prevents the progress navigation from sticking.

The shared SVG accepts a serving style: its kraft carton remains the default
for landing/login/dashboard, while an order using Buffet shows a serving tray.
Only the Pre-Pack preview has an open/closed box control; the sheet and mini
preview share this UI state. Food remains illustrative, not a rendered menu.

Android configuration now follows the Capacitor 8 migration baseline: AGP
8.13.0, Gradle 8.14.3, the corresponding AndroidX versions and the manifest
`density` configuration flag. The Gradle distribution and wrapper have pinned
checksums; CI uses the project's installed Capacitor CLI. The local build
script rejects Node below 22 and Java below 21 before installing dependencies.


### Bold Heritage roles and content refinement

The approved four brand swatches remain unchanged. Warm Ivory is used as a
neutral reading ink in dark mode; Espresso-derived surfaces replace the old
Amber-tinted surfaces. Vermilion-derived feature cards use their own readable
on-feature ink. Amber is reserved for primary actions, selection and highlights;
Emerald supports icons and secondary brand details. The scene, dashboard and
landing retain their paper artwork, visible edges and dimensional shadows.

Order help now contains the existing dismissible tip and Demo. Native summary
uses a disclosure, initially collapsed for steps 1–3 and expanded at review.
The web summary initially remains expanded. Existing handlers and data are reused.
Settings advanced controls are grouped behind a disclosure; the compact native
version/update row remains available. Daily internal notes remain in the admin
calendar. Account notification preferences remain in Profile, while device
biometric enrollment is owned by Settings. No stored preference is migrated or
removed by this presentation change.
