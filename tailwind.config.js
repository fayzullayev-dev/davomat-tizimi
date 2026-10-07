/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        border: v('border'),
        'border-strong': v('border-strong'),
        'surface-3': v('surface-3'),
        text: v('text'),
        muted: v('text-muted'),
        primary: { DEFAULT: v('primary'), hover: v('primary-hover'), soft: v('primary-soft'), fg: v('primary-fg'), ink: v('primary-ink') },
        'danger-fg': v('danger-fg'),
        success: { DEFAULT: v('success'), soft: v('success-soft'), ink: v('success-ink') },
        warning: { DEFAULT: v('warning'), soft: v('warning-soft'), ink: v('warning-ink') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft'), ink: v('danger-ink') },
        info: { DEFAULT: v('info'), soft: v('info-soft'), ink: v('info-ink') },
        neutral: { DEFAULT: v('neutral'), soft: v('neutral-soft'), ink: v('neutral-ink') },
        overlay: v('overlay'),
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '16px', ctl: '12px' },
      boxShadow: { card: 'var(--shadow-card)', pop: 'var(--shadow-pop)' },
    },
  },
  plugins: [],
};
