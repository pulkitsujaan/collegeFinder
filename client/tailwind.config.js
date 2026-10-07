/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware: these read CSS variables that `.theme-forest` swaps,
        // and the `<alpha-value>` hook keeps opacity modifiers working.
        paper: {
          DEFAULT: 'rgb(var(--paper-rgb) / <alpha-value>)',
          2: 'rgb(var(--paper-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--paper-3-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)',
        },
        rule: {
          DEFAULT: 'rgb(var(--rule-rgb) / 0.14)',
          soft: 'rgb(var(--rule-soft-rgb) / 0.08)',
          invert: 'rgb(var(--rule-invert-rgb) / 0.24)',
        },
        // Brand colours are fixed and never re-themed.
        forest: {
          DEFAULT: '#0F3D3E',
          deep: '#0A2C2D',
          light: '#1B5354',
        },
        vermilion: {
          DEFAULT: '#E4572E',
          dark: '#C4441F',
          light: '#F07A57',
        },
        marigold: {
          DEFAULT: '#F2B134',
          dark: '#C98A18',
        },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['"Instrument Sans Variable"', '"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Editorial display scale — fluid between phone and 1920px.
        'display-xl': ['clamp(3.25rem, 11vw, 8.75rem)', { lineHeight: '0.92', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.5rem, 7vw, 4.75rem)', { lineHeight: '0.95', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(2rem, 4.5vw, 3rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        numeral: ['clamp(2.75rem, 8vw, 6rem)', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
        label: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.14em' }],
      },
      borderColor: {
        DEFAULT: 'rgb(var(--rule-rgb) / 0.14)',
      },
      borderRadius: {
        // Deliberately restrained: this design is printed, not pill-shaped.
        card: '2px',
        pill: '999px',
      },
      boxShadow: {
        lift: '0 18px 40px -24px rgba(20,23,26,0.45)',
        sheet: '0 -18px 60px -20px rgba(20,23,26,0.4)',
      },
      maxWidth: {
        prose: '68ch',
        page: '1440px',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-160% 0' },
          '100%': { backgroundPosition: '260% 0' },
        },
        'tray-up': {
          '0%': { transform: 'translateY(110%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'tray-up': 'tray-up 260ms cubic-bezier(0.22,0.61,0.36,1)',
      },
    },
  },
  plugins: [],
};
