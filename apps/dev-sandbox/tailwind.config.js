/** @type {import('tailwindcss').Config} */
const { createTailwindConfig } = require('@ioc-core/config/tailwind');

module.exports = createTailwindConfig({
  additionalContent: [
    './templates/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  extend: {
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      'dev-primary': '#6366f1',
      'dev-secondary': '#8b5cf6',
      'dev-accent': '#06b6d4',
      'dev-warning': '#f59e0b',
      'dev-success': '#10b981',
      'dev-error': '#ef4444',
      'dev-muted': '#6b7280',
    },
    fontFamily: {
      'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
    },
    animation: {
      'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      'bounce-slow': 'bounce 2s infinite',
      'spin-slow': 'spin 3s linear infinite',
    },
    spacing: {
      '128': '32rem',
    },
    maxWidth: {
      '8xl': '88rem',
      '9xl': '96rem',
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
});