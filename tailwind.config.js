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
      },
      letterSpacing: {
        'hero': '-0.025em',
      },
    },
  },
  plugins: [],
};
