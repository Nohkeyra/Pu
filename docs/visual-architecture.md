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
