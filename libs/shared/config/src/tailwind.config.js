/**
 * @fileoverview Shared Tailwind CSS configuration for IOC Core monorepo
 * @description Base Tailwind configuration with IOC brand colors and common utilities
 */

const { brandColors, gradients } = require('./brand-colors');

/**
 * Base Tailwind CSS configuration
 * @type {import('tailwindcss').Config}
 */
const baseConfig = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './templates/**/*.{js,ts,jsx,tsx,mdx}',
    // Include shared packages
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/lib/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: brandColors,
      backgroundImage: gradients,
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'ioc-soft': '0 4px 6px -1px rgba(30, 58, 138, 0.1), 0 2px 4px -1px rgba(30, 58, 138, 0.06)',
        'ioc-medium': '0 10px 15px -3px rgba(30, 58, 138, 0.1), 0 4px 6px -2px rgba(30, 58, 138, 0.05)',
        'ioc-strong': '0 20px 25px -5px rgba(30, 58, 138, 0.1), 0 10px 10px -5px rgba(30, 58, 138, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

/**
 * Create environment-specific Tailwind configuration
 * @param {Object} options - Configuration options
 * @param {string[]} options.additionalContent - Additional content paths
 * @param {Object} options.extend - Additional theme extensions
 * @param {Array} options.plugins - Additional plugins
 * @returns {import('tailwindcss').Config} Extended Tailwind configuration
 */
function createTailwindConfig(options = {}) {
  const { additionalContent = [], extend = {}, plugins = [] } = options;
  
  return {
    ...baseConfig,
    content: [
      ...baseConfig.content,
      ...additionalContent,
    ],
    theme: {
      ...baseConfig.theme,
      extend: {
        ...baseConfig.theme.extend,
        ...extend,
      },
    },
    plugins: [
      ...baseConfig.plugins,
      ...plugins,
    ],
  };
}

module.exports = {
  baseConfig,
  createTailwindConfig,
  // Export default for direct usage
  default: baseConfig,
};