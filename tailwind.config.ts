import type { Config } from 'tailwindcss';

// Toàn bộ màu map qua CSS variables (mục 6 CLAUDE.md) — cấm hardcode hex trong component.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        heading: 'var(--heading)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-soft': 'var(--primary-soft)',
        'dk-badge': 'var(--dk-badge)',
        pres: {
          bg: 'var(--pres-bg)',
          surface: 'var(--pres-surface)',
          ink: 'var(--pres-ink)',
          line: 'var(--pres-line)',
          accent: 'var(--pres-accent)',
          sub: 'var(--pres-sub)',
        },
        lit: {
          xanh: 'var(--lit-xanh)',
          tim: 'var(--lit-tim)',
          do: 'var(--lit-do)',
          trang: 'var(--lit-trang)',
          hong: 'var(--lit-hong)',
        },
      },
      borderRadius: {
        token: 'var(--radius)',
        'token-2': 'var(--radius-2)',
      },
      fontFamily: {
        display: ['var(--f-display)'],
        sans: ['var(--font-bvp)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
