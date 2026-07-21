# Restoran Wawasan Pak Usop — Landing Page

Reorganized from a chat transcript containing multiple design iterations for the
Restoran Wawasan Pak Usop (Putrajaya) website rebuild.

## How this was organized

The original transcript contained several rounds of edits to the same files
(color palette migrations, section rewrites, etc.). Each named file below
reflects the **most recent version** referenced in the conversation.

```
project/
├── tailwind.config.js       # Final brand palette (light-theme migration)
├── index.css                 # Final global styles / CSS variables
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx   # Main landing page assembly
│   │   └── OrderPage.tsx     # Order flow page
│   └── components/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── MobileMenu.tsx
│       ├── HeroSection.tsx
│       ├── StorySection.tsx
│       ├── MenuSection.tsx
│       ├── ExperienceSection.tsx
│       ├── FoodCard.tsx
│       ├── ReviewCard.tsx
│       └── PrincipleCard.tsx
└── history/
    └── draft_XX_lineNNN.*     # Earlier full-page drafts, kept for reference
                                 (superseded by the files above)
```

## Notes

- `history/` holds earlier, unnamed full-`LandingPage` drafts (dark "kopi"
  theme, before the light-theme migration) plus one earlier snippet — kept
  in case you want to compare or recover something from an earlier direction.
- Some components reference files not present in the transcript
  (`@/components/ui/button`, `@/components/SectionLabel`,
  `@/context/LanguageContext`) — these were pre-existing project files not
  pasted into the chat, so you'll need to reconnect this to your actual
  codebase for it to build.
- Image assets referenced (e.g. `/assets/putrajaya-lake-view.jpg`) are not
  included — see the image mapping table that was in the original chat if
  you still have it.
