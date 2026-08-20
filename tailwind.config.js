/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ========== CURRENT COLOR TOKENS ==========
        // Values are defined as CSS custom properties in src/index.css
        // (see :root and .dark blocks there for the actual hex values).
        
        'deep-forest':   'var(--color-deep-forest)',
        'deep-forest-accent': 'var(--color-deep-forest-accent)',
        'forest-green':  'var(--color-forest)',
        'light-forest':  'var(--color-light-forest)',
        
        // Warm & Appetizing Accents
        'sunshine':      'var(--color-sunshine)',
        'honey':         'var(--color-honey)',
        'crisp-carrot':  'var(--color-crisp-carrot)',
        'tomato-burst':  'var(--color-tomato-burst)',
        // kiwi/fern (2026-08-14): remapped from neon lime (#39FF14) to
        // crisp-carrot per the new 4-color light-mode palette — see
        // src/index.css :root for the full rationale. Token names kept
        // as-is since 15+ components reference bg-kiwi/text-kiwi/etc.
        // directly; renaming the Tailwind key would require touching every
        // one of those call sites for a purely cosmetic rename.
        'kiwi':          'var(--color-kiwi)',
        'fern':          'var(--color-kiwi)',
        
        // Neutrals
        'cream':         'var(--color-cream)',
        'cream-dark':    'var(--color-cream-dark)',
        'charcoal':      'var(--color-charcoal)',
        
        // Legacy aliases for backward compatibility removed during light-theme migration

        // Shadcn tokens updated for dark theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        // primary (2026-08-14): was pointing at raw --color-sunshine
        // (mustard #f69913) with --color-cream foreground — mustard fails
        // AA contrast even against white (2.21:1), let alone cream, which
        // is darker than white. Repointed to --color-sunshine-cta, whose
        // -fg token already varies correctly per mode (white in light mode,
        // since light's sunshine-cta = tomato; dark charcoal in dark mode,
        // since dark's sunshine-cta = mustard, which needs dark text — see
        // .dark block in index.css). Previously this was hardcoded to
        // '#FFFFFF' always, which broke contrast in dark mode specifically
        // (white text on mustard = 2.21:1, fails badly) — found and fixed
        // while wiring AuthModal.tsx to these tokens.
        primary: {
          DEFAULT: 'var(--color-sunshine-cta)',
          foreground: 'var(--color-sunshine-cta-fg)',
        },
        secondary: {
          DEFAULT: 'var(--color-cream-dark)',
          foreground: 'var(--color-deep-forest)',
        },
        destructive: {
          DEFAULT: 'var(--color-tomato-burst)',
          foreground: 'var(--color-cream)',
        },
      },
      fontFamily: {
        display: ['"Outfit"', '"Syne"', '"Plus Jakarta Sans"', '"Space Grotesk"', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        hype:    ['"Syne"', '"Outfit"', '"Bebas Neue"', 'sans-serif'],
        bebas:   ['"Bebas Neue"', 'sans-serif'],
        accent:  ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
        urban:   ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        'sunshine-glow': '0 8px 30px rgba(233, 149, 8, 0.35)',
        'carrot-glow':   '0 8px 30px rgba(191, 74, 3, 0.35)',
        'kiwi-glow':     '0 8px 30px rgba(200, 89, 3, 0.35)',
        'forest-glow':   '0 8px 30px rgba(12, 69, 60, 0.15)',
      },
      keyframes: {
        "bounce-down": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 202, 38, 0.25)" },
          "50%":      { boxShadow: "0 0 30px rgba(255, 202, 38, 0.45)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        "leaf-sway": {
          "0%, 100%": { transform: "rotate(-5deg)" },
          "50%":      { transform: "rotate(5deg)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "success-pop": {
          "0%":   { transform: "scale(0.8)", opacity: "0" },
          "50%":  { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%":      { transform: "translateX(-4px)" },
          "75%":      { transform: "translateX(4px)" },
        }
      },
      animation: {
        "bounce-down": "bounce-down 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite",
        "float": "float 6s ease-in-out infinite",
        "leaf-sway": "leaf-sway 4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "success-pop": "success-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "shake": "shake 0.3s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
