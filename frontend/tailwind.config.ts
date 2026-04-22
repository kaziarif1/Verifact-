import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:    { DEFAULT: '#1a1008', light: '#3d2b1f', faint: '#6b5344' },
        paper:  { DEFAULT: '#f5f0e8', dark: '#ede7d5', mid: '#e8e0cc' },
        rule:   '#2a1f14',
        'news-red':   '#c0392b',
        'news-gold':  '#b8860b',
        'news-blue':  '#1a5276',
        'fact-green': '#1e8449',
        'rumor-red':  '#c0392b',
        'pending-amber': '#d68910',
      },
      fontFamily: {
        masthead: ['"UnifrakturMaguntia"', 'cursive'],
        headline: ['"Playfair Display"', 'Georgia', 'serif'],
        serif:    ['"Source Serif 4"', 'Georgia', 'serif'],
        sans:     ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:     ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'ticker':     'ticker-scroll 40s linear infinite',
        'ink-drop':   'ink-drop 0.6s ease both',
        'headline-in':'headline-in 0.5s ease both',
        'splat':      'splat 0.3s ease',
        'press':      'press 0.4s ease',
        'float':      'float 6s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s ease infinite',
        'stamp':      'stamp 0.35s cubic-bezier(0.36,0.07,0.19,0.97) both',
      },
      keyframes: {
        'ink-drop': {
          '0%':   { opacity: '0', transform: 'scale(0.8) translateY(-10px)' },
          '60%':  { transform: 'scale(1.05) translateY(2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'headline-in': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'press': {
          '0%,100%': { transform: 'scaleY(1)' },
          '50%':     { transform: 'scaleY(0.96)' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        'stamp': {
          '0%':   { transform: 'scale(3) rotate(-15deg)', opacity: '0' },
          '60%':  { transform: 'scale(0.9) rotate(2deg)', opacity: '1' },
          '80%':  { transform: 'scale(1.05) rotate(-1deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
