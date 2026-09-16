# Design System Skill

Loaded on demand when the user asks to create a **design system** or **UI kit**.
Produces a folder of typography/colors/assets/tokens + React component recreations.

---

## Compiler Contract

An automated compiler scans this project. It finds things by **file content and
sibling relationships** — not folder names. The only fixed path:

- **`styles.css` at project root** (or `index.css` / `globals.css` / `main.css` /
  `theme.css` / `tokens.css` — first match). Keep it as `@import` lines only.
  Everything it transitively imports ships to consumers.

Default layout (unless repo already has its own):

- `tokens/` — one CSS file per concern (`colors.css`, `typography.css`, `spacing.css`),
  each `@import`ed from `styles.css`
- `components/<group>/` — React UI primitives
- `ui_kits/<product>/` — full-screen recreations of real product views
- `guidelines/` — specimen cards + deeper prose
- `assets/` — logos, icons, illustrations
- `readme.md` — design guide & manifest

What the compiler detects:

- **Component**: `<Name>.jsx` / `.tsx` (PascalCase) + sibling `<Name>.d.ts`,
  plus `<Name>.prompt.md` and one `@dsCard`-tagged `.html` per directory
- **Token**: any `--*` custom property under `:root` reachable from `styles.css`
- **Font**: any `@font-face` rule in that closure

---

## Workflow

1. **Explore** — codebase, Figma, assets. Source of truth: `src/index.css`,
   `tailwind.config.*`, existing `src/components/ui/`.

2. **`readme.md`** — understanding + sources + **CONTENT FUNDAMENTALS** (tone, casing,
   I/you, emoji) + **VISUAL FOUNDATIONS** (colors, type, spacing, backgrounds, animation,
   hover/press states, borders, shadows, radii, cards, transparency, imagery vibe).

3. **Tokens** — base values + semantic aliases; `@font-face` rules;
   `styles.css` = imports only.

4. **Specimen cards** — ~700×150px each (12–20+), one concept per card, tagged:
   ```
   <!-- @dsCard group="<Group>" viewport="700x<height>" subtitle="<line>" name="<Name>" -->
   ```
   Groups: Type · Colors · Spacing · Brand

5. **Assets** — copy logos/icons/illustrations into `assets/`.
   **If no logo exists, do NOT create one** — render brand name in plain type.
   Never draw a company's real logo from memory. For icons, copy existing SVGs first;
   else CDN (repo uses `lucide-react`); else closest CDN match + **FLAG substitution**.

6. **Components** — one file each: `export function <Name>(props) {…}` + `.d.ts` +
   `.prompt.md` + one `@dsCard` card HTML per directory.
   CSS custom properties only, no CSS-in-JS, no npm packages.

7. **UI kits** — `{README.md, index.html, Screen1.jsx, …}` per product, tagged:
   ```
   <!-- @dsCard group="<Product>" viewport="<W>x<H>" -->
   ```

8. **Slides** (only if slide templates given) — one HTML per slide type, tagged
   `group="Slides" viewport="1280x720"`.

9. **`SKILL.md`** — template below.

---

## Component Rules

- **If the source defines components** (Figma, existing library) → build **exactly
  those families**. Do not invent primitives the source doesn't have.
- **If no source defines components** → author a standard set (Button, Input, Select,
  Card, Badge, etc.).
- Enumerate the FULL inventory first, put every family on the todo list, build ALL.
- Do **NOT** write `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`,
  or barrel `index.js` — auto-generated.

---

## UI Kit Rules

- Recreations of **screens, not primitives**. Compose from components; do not
  re-implement Button inside a kit.
- Replicate the existing design. **Do not invent.**
- Never work from screenshots alone — use codebase or Figma `get-design-context`.
- The kit is ground truth: copy exact values (5px is 5px, not 4px).

---

## Starting Points

- **Component**: add `@startingPoint section="<group>" subtitle="<line>" viewport="<WxH>"`
  to `.d.ts` JSDoc.
- **Screen**: add `<!-- @startingPoint section="<group>" subtitle="<line>" viewport="<WxH>" -->`
  as first line of HTML.

---

## SKILL.md Template

When done, create `SKILL.md`:

```markdown
---
name: {brand}-design
description: Use this skill to generate well-branded interfaces and assets for {brand}, either for production or throwaway prototypes/mocks. Contains design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, prototypes), copy assets out and create static HTML files. For production code, copy assets and read the rules here to become an expert in designing with this brand.
If invoked without guidance, ask the user what they want to build or design, ask a few questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
```

---

## Known Exceptions

The following raw `<button>` elements are purposefully retained and exempt from `<Button>` primitive migration:

| File | Lines | Category | Reason |
|---|---|---|---|
| `src/pages/OrderPage.tsx` | ~95 | Brand Nav Wrapper | Multi-line brand logo & identity header touch target navigating to `/home`. Not an action button. |
| `src/pages/ProfilePage.tsx` | ~53 | Brand Nav Wrapper | Semantic brand logo + section title touch target navigating to `/home`. |
| `src/pages/SettingsPage.tsx` | ~813 | Brand Nav Wrapper | Top navigation identity header touch target navigating to `/home`. |
| `src/pages/CalendarPage.tsx` | ~654 | Calendar Matrix Day Cell | Domain-specific calendar grid cell (aspect-square matrix layout with day numbers, booking indicators, and holiday states). |