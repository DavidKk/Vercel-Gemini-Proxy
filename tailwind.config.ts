import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#eef1f6',
        surface: '#ffffff',
        border: '#d5dbe8',
        primary: '#0b1220',
        muted: '#5b657a',
        subtle: '#334155',
        panel: {
          DEFAULT: '#0f172a',
          fg: '#e2e8f0',
          muted: '#94a3b8',
        },
        brand: {
          DEFAULT: '#0e7490',
          soft: '#ecfeff',
          hover: '#155e75',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        composer: '0 1px 2px rgba(11, 18, 32, 0.04), 0 10px 28px rgba(11, 18, 32, 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
