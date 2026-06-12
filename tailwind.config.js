/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // === Airbotix K-12 design system v2 (see ../airbotix/DESIGN.md) ===
        brand: {
          coral:     '#FF7A66',
          bubblegum: '#FF6BA9',
          sunshine:  '#FFD43B',
          sky:       '#5DAEFF',
          mint:      '#3DD9A9',
        },
        wash: {
          coral:     '#FFEFE9',
          bubblegum: '#FFEAF3',
          sunshine:  '#FFF7D6',
          sky:       '#E8F2FF',
          mint:      '#DCF6EC',
        },
        ink: {
          DEFAULT: '#1F1B2D',
          soft:    '#3D3851',
        },
        canvas: {
          DEFAULT: '#FFFEF7',
          pure:    '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FFF8EE',
          soft:    '#FFF1DE',
        },
        hairline: {
          DEFAULT: '#EFE8DA',
          soft:    '#F5EFE3',
        },
        slate2: '#6B6478',
        steel:  '#9C95AB',
        stone2: '#C7C0D5',
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
        // Playground themeable tokens — resolve to CSS vars set per `data-theme`
        // (see src/pages/learn/playground/playground.css). Light = default,
        // dark = the `[data-theme="dark"]` subtree. Channel form keeps Tailwind
        // opacity modifiers working (e.g. `bg-pg-text/10`).
        pg: {
          bg:           'rgb(var(--pg-bg) / <alpha-value>)',
          desktop:      'rgb(var(--pg-desktop) / <alpha-value>)',
          surface:      'rgb(var(--pg-surface) / <alpha-value>)',
          'surface-2':  'rgb(var(--pg-surface-2) / <alpha-value>)',
          border:       'rgb(var(--pg-border) / <alpha-value>)',
          text:         'rgb(var(--pg-text) / <alpha-value>)',
          'text-dim':   'rgb(var(--pg-text-dim) / <alpha-value>)',
          'text-muted': 'rgb(var(--pg-text-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        handwritten: ['"Caveat"', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        hero: '40px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      backgroundImage: {
        'grad-coral':     'linear-gradient(135deg, #FF9A80 0%, #FF5B7E 100%)',
        'grad-bubblegum': 'linear-gradient(135deg, #FF8FBE 0%, #FF4F8F 100%)',
        'grad-sunshine':  'linear-gradient(135deg, #FFE26B 0%, #FFB638 100%)',
        'grad-sky':       'linear-gradient(135deg, #7FC2FF 0%, #3D8FFF 100%)',
        'grad-mint':      'linear-gradient(135deg, #6BE7BF 0%, #1FC692 100%)',
      },
      boxShadow: {
        'brand-coral':     '0 16px 40px -8px rgba(255, 122, 102, 0.40)',
        'brand-bubblegum': '0 16px 40px -8px rgba(255, 107, 169, 0.40)',
        'brand-sunshine':  '0 16px 40px -8px rgba(255, 212, 59, 0.45)',
        'brand-sky':       '0 16px 40px -8px rgba(93, 174, 255, 0.40)',
        'brand-mint':      '0 16px 40px -8px rgba(61, 217, 169, 0.40)',
        'card-soft':       '0 8px 24px -6px rgba(31, 27, 45, 0.10)',
        'sticker':         '4px 4px 0 0 rgba(31, 27, 45, 0.95)',
        // demo tour spotlight: the cut-out div's shadow IS the scrim (ink @ 50%)
        'spotlight-scrim': '0 0 0 200vmax rgba(31, 27, 45, 0.50)',
      },
      letterSpacing: {
        'hero': '-0.025em',
      },
      keyframes: {
        // demo tour card entrance: a short rise/fade so per-step placement
        // jumps read as a new card arriving (paired with motion-reduce:animate-none)
        'tour-card-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'tour-card-in': 'tour-card-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
