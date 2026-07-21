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
        'forest-green':  'var(--color-forest)',
        'light-forest':  'var(--color-light-forest)',
        
        // Warm & Appetizing Accents
        'sunshine':      'var(--color-sunshine)',
        'honey':         'var(--color-honey)',
        'crisp-carrot':  'var(--color-crisp-carrot)',
        'tomato-burst':  'var(--color-tomato-burst)',
        'kiwi':          'var(--color-kiwi)',
        'fern':          'var(--color-kiwi)',
        
        // Neutrals
        'cream':         'var(--color-cream)',
        'cream-dark':    'var(--color-cream-dark)',
        'charcoal':      'var(--color-charcoal)',
        'stone':         'var(--color-stone)',
        
        // Legacy aliases for backward compatibility
        'amber':         'var(--color-sunshine)',
        'warm-gold':     'var(--color-sunshine)',
        'moss':          'var(--color-kiwi)',
        'sage':          'var(--color-forest)',
        'deep-brown':    'var(--color-forest)',

        // ========== NEW DIRECTION — playful/energetic dark palette ==========
        // Added additively. Use the matching `on-*` color for text/icons
        // placed on top of these backgrounds (pre-checked for WCAG contrast).
        'charcoal-bg':      'var(--color-charcoal-bg)',
        'charcoal-surf':    'var(--color-charcoal-surf)',
        'orange-new':       'var(--color-orange-new)',
        'orange-hover':     'var(--color-orange-hover)',
        'lime-new':         'var(--color-lime-new)',
        'mint-new':         'var(--color-mint-new)',
        'text-new':         'var(--color-text-new)',
        'text-muted-new':   'var(--color-text-muted-new)',

        'on-charcoal-bg':   'var(--on-charcoal-bg)',
        'on-charcoal-surf': 'var(--on-charcoal-surf)',
        'on-orange-new':    'var(--on-orange-new)',
        'on-orange-hover':  'var(--on-orange-hover)',
        'on-lime-new':      'var(--on-lime-new)',
        'on-mint-new':      'var(--on-mint-new)',
        
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
        
        primary: {
          DEFAULT: 'var(--color-sunshine)',
          foreground: 'var(--color-cream)',
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
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        accent:  ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
        urban:   ['"Permanent Marker"', 'cursive', 'sans-serif'],
        graffiti: ['"Sedgwick Ave Display"', 'cursive', 'sans-serif'],
        celtic:   ['"Uncial Antiqua"', 'cursive', 'serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        'sunshine-glow': '0 8px 30px rgba(255, 202, 38, 0.35)',
        'carrot-glow':   '0 8px 30px rgba(248, 96, 21, 0.35)',
        'kiwi-glow':     '0 8px 30px rgba(154, 188, 4, 0.35)',
        'forest-glow':   '0 8px 30px rgba(25, 83, 43, 0.15)',
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
