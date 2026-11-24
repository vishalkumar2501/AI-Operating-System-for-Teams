/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          DEFAULT: 'var(--surface-1)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        text: {
          DEFAULT: 'var(--text)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          pressed: 'var(--primary-pressed)',
          subtle: 'var(--primary-subtle)',
          on: 'var(--on-primary)',
        },
        'on-primary': 'var(--on-primary)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          pressed: 'var(--accent-pressed)',
          subtle: 'var(--accent-subtle)',
          on: 'var(--on-accent)',
        },
        'on-accent': 'var(--on-accent)',
        ai: {
          bg: 'var(--ai-bg)',
          text: 'var(--ai-text)',
          subtle: 'var(--ai-subtle)',
          border: 'var(--ai-border)',
        },
        semantic: {
          success: 'var(--success)',
          'success-subtle': 'var(--success-subtle)',
          'success-border': 'var(--success-border)',
          info: 'var(--info)',
          'info-subtle': 'var(--info-subtle)',
          'info-border': 'var(--info-border)',
          warning: 'var(--warning)',
          'warning-subtle': 'var(--warning-subtle)',
          'warning-border': 'var(--warning-border)',
          danger: 'var(--danger)',
          'danger-subtle': 'var(--danger-subtle)',
          'danger-border': 'var(--danger-border)',
          neutral: 'var(--neutral)',
          'neutral-subtle': 'var(--neutral-subtle)',
          'neutral-border': 'var(--neutral-border)',
        },
        ring: 'var(--ring)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
