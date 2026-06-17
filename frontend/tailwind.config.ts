import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':   'var(--bg-primary)',
        'bg-card':      'var(--bg-card)',
        'bg-elevated':  'var(--bg-elevated)',
        'gold':         '#FFD700',
        'gold-dim':     '#B8960C',
        'oly-red':      '#E63946',
        'oly-blue':     '#457B9D',
        'oly-green':    '#2A9D8F',
        'oly-navy':     '#1D3557',
        /* True Olympic ring colours */
        'ring-blue':    '#0081C8',
        'ring-yellow':  '#FCB131',
        'ring-green':   '#009F3D',
        'ring-red':     '#EE334E',
        'ring-black':   '#101010',
        'pro-purple':   '#A78BFA',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        archivo: ['"Archivo"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 40px rgba(255,215,0,0.25)',
        'card':      '0 4px 32px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #06061A 0%, #0D0D2B 50%, #06061A 100%)',
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,215,0,0.2)' },
          '50%':      { boxShadow: '0 0 50px rgba(255,215,0,0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
