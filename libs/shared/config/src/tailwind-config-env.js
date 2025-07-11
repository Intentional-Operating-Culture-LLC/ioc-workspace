/**
 * @fileoverview Environment-specific Tailwind CSS configurations
 * @description Advanced Tailwind configurations optimized for each environment
 */

const { baseConfig } = require('./tailwind.config.js');
const { brandColors, gradients } = require('./brand-colors');

/**
 * Common Tailwind plugins for all environments
 */
const commonPlugins = [
  require('@tailwindcss/forms'),
  require('@tailwindcss/typography'),
  require('@tailwindcss/aspect-ratio'),
  require('@tailwindcss/container-queries'),
];

/**
 * Production Tailwind configuration
 * Optimized for performance and minimal bundle size
 */
const productionConfig = {
  ...baseConfig,
  
  // Production content paths
  content: [
    ...baseConfig.content,
    './node_modules/@ioc/ui/dist/**/*.js',
    './node_modules/@ioc/lib/dist/**/*.js',
    // Exclude development/testing files
    '!./src/**/*.test.{js,ts,jsx,tsx}',
    '!./src/**/*.spec.{js,ts,jsx,tsx}',
    '!./src/**/*.stories.{js,ts,jsx,tsx}',
  ],
  
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      
      // Production-specific theme extensions
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      
      // Production color palette (full)
      colors: {
        ...brandColors,
        // Additional production colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          900: '#7f1d1d',
        },
      },
      
      // Production typography
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'rgb(55 65 81)',
            lineHeight: '1.7',
            h1: {
              fontSize: '2.25rem',
              fontWeight: '700',
              lineHeight: '1.2',
            },
            h2: {
              fontSize: '1.875rem',
              fontWeight: '600',
              lineHeight: '1.3',
            },
            h3: {
              fontSize: '1.5rem',
              fontWeight: '600',
              lineHeight: '1.4',
            },
            code: {
              backgroundColor: 'rgb(243 244 246)',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
        lg: {
          css: {
            fontSize: '1.125rem',
            lineHeight: '1.8',
          },
        },
      },
      
      // Production animations (minimal)
      animation: {
        ...baseConfig.theme.extend.animation,
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      
      // Production-specific utilities
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '64px',
      },
      
      // Production spacing
      spacing: {
        ...baseConfig.theme.extend.spacing,
        '128': '32rem',
        '144': '36rem',
      },
      
      // Production shadows
      boxShadow: {
        ...baseConfig.theme.extend.boxShadow,
        'ioc-xl': '0 25px 50px -12px rgba(30, 58, 138, 0.25)',
        'ioc-2xl': '0 25px 50px -12px rgba(30, 58, 138, 0.25)',
        'ioc-inner': 'inset 0 2px 4px 0 rgba(30, 58, 138, 0.06)',
      },
    },
  },
  
  plugins: [
    ...commonPlugins,
    // Production-specific plugins
    require('tailwindcss-animate'),
    require('@tailwindcss/line-clamp'),
    
    // Custom production utilities
    function({ addUtilities }) {
      addUtilities({
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-pretty': {
          'text-wrap': 'pretty',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
  
  // Production optimizations
  corePlugins: {
    // Enable all core plugins for production
    preflight: true,
    container: true,
    accessibility: true,
    pointerEvents: true,
    visibility: true,
    position: true,
    inset: true,
    isolation: true,
    zIndex: true,
    order: true,
    gridColumn: true,
    gridColumnStart: true,
    gridColumnEnd: true,
    gridRow: true,
    gridRowStart: true,
    gridRowEnd: true,
    float: true,
    clear: true,
    margin: true,
    boxSizing: true,
    display: true,
    aspectRatio: true,
    size: true,
    height: true,
    maxHeight: true,
    minHeight: true,
    width: true,
    minWidth: true,
    maxWidth: true,
    flex: true,
    flexShrink: true,
    flexGrow: true,
    flexBasis: true,
    tableLayout: true,
    captionSide: true,
    borderCollapse: true,
    borderSpacing: true,
    transformOrigin: true,
    translate: true,
    rotate: true,
    skew: true,
    scale: true,
    transform: true,
    animation: true,
    cursor: true,
    touchAction: true,
    userSelect: true,
    resize: true,
    scrollSnapType: true,
    scrollSnapAlign: true,
    scrollSnapStop: true,
    scrollMargin: true,
    scrollPadding: true,
    listStylePosition: true,
    listStyleType: true,
    listStyleImage: true,
    appearance: true,
    columns: true,
    breakBefore: true,
    breakInside: true,
    breakAfter: true,
    gridAutoColumns: true,
    gridAutoFlow: true,
    gridAutoRows: true,
    gridTemplateColumns: true,
    gridTemplateRows: true,
    flexDirection: true,
    flexWrap: true,
    placeContent: true,
    placeItems: true,
    alignContent: true,
    alignItems: true,
    justifyContent: true,
    justifyItems: true,
    gap: true,
    space: true,
    divideWidth: true,
    divideStyle: true,
    divideColor: true,
    divideOpacity: true,
    placeSelf: true,
    alignSelf: true,
    justifySelf: true,
    overflow: true,
    overscrollBehavior: true,
    scrollBehavior: true,
    textOverflow: true,
    hyphens: true,
    whitespace: true,
    wordBreak: true,
    borderRadius: true,
    borderWidth: true,
    borderStyle: true,
    borderColor: true,
    borderOpacity: true,
    backgroundColor: true,
    backgroundOpacity: true,
    backgroundImage: true,
    gradientColorStops: true,
    backgroundSize: true,
    backgroundAttachment: true,
    backgroundClip: true,
    backgroundPosition: true,
    backgroundRepeat: true,
    backgroundOrigin: true,
    fill: true,
    stroke: true,
    strokeWidth: true,
    objectFit: true,
    objectPosition: true,
    padding: true,
    textAlign: true,
    textColor: true,
    textOpacity: true,
    textDecoration: true,
    textDecorationColor: true,
    textDecorationStyle: true,
    textDecorationThickness: true,
    textUnderlineOffset: true,
    textTransform: true,
    textIndent: true,
    verticalAlign: true,
    fontFamily: true,
    fontSize: true,
    fontWeight: true,
    fontVariantNumeric: true,
    lineHeight: true,
    letterSpacing: true,
    textWrap: true,
    placeholderColor: true,
    placeholderOpacity: true,
    caretColor: true,
    accentColor: true,
    opacity: true,
    boxShadow: true,
    boxShadowColor: true,
    outlineWidth: true,
    outlineStyle: true,
    outlineColor: true,
    outlineOffset: true,
    ringWidth: true,
    ringColor: true,
    ringOpacity: true,
    ringOffsetWidth: true,
    ringOffsetColor: true,
    blur: true,
    brightness: true,
    contrast: true,
    dropShadow: true,
    grayscale: true,
    hueRotate: true,
    invert: true,
    saturate: true,
    sepia: true,
    filter: true,
    backdropBlur: true,
    backdropBrightness: true,
    backdropContrast: true,
    backdropGrayscale: true,
    backdropHueRotate: true,
    backdropInvert: true,
    backdropOpacity: true,
    backdropSaturate: true,
    backdropSepia: true,
    backdropFilter: true,
    transitionProperty: true,
    transitionDelay: true,
    transitionDuration: true,
    transitionTimingFunction: true,
    willChange: true,
    content: true,
  },
};

/**
 * Beta/Staging Tailwind configuration
 * Includes additional utilities for testing and debugging
 */
const betaConfig = {
  ...baseConfig,
  
  // Beta content paths
  content: [
    ...baseConfig.content,
    './node_modules/@ioc/ui/dist/**/*.js',
    './node_modules/@ioc/lib/dist/**/*.js',
    // Include test files for beta
    './src/**/*.test.{js,ts,jsx,tsx}',
    './src/**/*.spec.{js,ts,jsx,tsx}',
    './src/**/*.stories.{js,ts,jsx,tsx}',
  ],
  
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      
      // Beta-specific theme extensions
      colors: {
        ...brandColors,
        // Beta testing colors
        beta: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        debug: {
          50: '#fef7ff',
          100: '#fce7ff',
          200: '#f8d4fe',
          300: '#f2b5fc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      
      // Beta animations (more for testing)
      animation: {
        ...baseConfig.theme.extend.animation,
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'flash': 'flash 1s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      
      keyframes: {
        ...baseConfig.theme.extend.keyframes,
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      
      // Beta spacing
      spacing: {
        ...baseConfig.theme.extend.spacing,
        '100': '25rem',
        '112': '28rem',
      },
    },
  },
  
  plugins: [
    ...commonPlugins,
    require('tailwindcss-animate'),
    require('@tailwindcss/line-clamp'),
    
    // Beta-specific plugins
    function({ addUtilities, addComponents }) {
      addUtilities({
        '.debug-border': {
          border: '1px solid #e879f9',
          backgroundColor: 'rgba(232, 121, 249, 0.1)',
        },
        '.debug-bg': {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
        '.beta-badge': {
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#d946ef',
          color: '#ffffff',
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          zIndex: '9999',
        },
      });
      
      addComponents({
        '.beta-notification': {
          '@apply bg-beta-100 border-beta-200 text-beta-800 px-4 py-3 rounded-md border': {},
        },
        '.debug-panel': {
          '@apply fixed bottom-4 left-4 bg-debug-100 border border-debug-200 rounded-lg p-4 shadow-lg': {},
        },
      });
    },
  ],
  
  // Beta mode settings
  mode: 'jit',
  safelist: [
    'debug-border',
    'debug-bg',
    'beta-badge',
    'beta-notification',
    'debug-panel',
  ],
};

/**
 * Development Tailwind configuration
 * Optimized for development experience with all utilities
 */
const developmentConfig = {
  ...baseConfig,
  
  // Development content paths
  content: [
    ...baseConfig.content,
    './node_modules/@ioc/ui/src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@ioc/lib/src/**/*.{js,ts,jsx,tsx}',
    // Include all development files
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './stories/**/*.{js,ts,jsx,tsx}',
  ],
  
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      
      // Development-specific theme extensions
      colors: {
        ...brandColors,
        // Development colors
        dev: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      
      // Development spacing (more granular)
      spacing: {
        ...baseConfig.theme.extend.spacing,
        '15': '3.75rem',
        '17': '4.25rem',
        '19': '4.75rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '36': '9rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '46': '11.5rem',
        '50': '12.5rem',
        '54': '13.5rem',
        '58': '14.5rem',
        '62': '15.5rem',
        '66': '16.5rem',
        '70': '17.5rem',
        '74': '18.5rem',
        '78': '19.5rem',
        '82': '20.5rem',
        '86': '21.5rem',
        '90': '22.5rem',
        '94': '23.5rem',
        '98': '24.5rem',
      },
      
      // Development animations (all)
      animation: {
        ...baseConfig.theme.extend.animation,
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out infinite',
        'rubber-band': 'rubber-band 1s ease-in-out',
        'jello': 'jello 1s ease-in-out',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
      
      keyframes: {
        ...baseConfig.theme.extend.keyframes,
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        'rubber-band': {
          '0%': { transform: 'scale3d(1, 1, 1)' },
          '30%': { transform: 'scale3d(1.25, 0.75, 1)' },
          '40%': { transform: 'scale3d(0.75, 1.25, 1)' },
          '50%': { transform: 'scale3d(1.15, 0.85, 1)' },
          '65%': { transform: 'scale3d(0.95, 1.05, 1)' },
          '75%': { transform: 'scale3d(1.05, 0.95, 1)' },
          '100%': { transform: 'scale3d(1, 1, 1)' },
        },
        jello: {
          '0%, 11.1%, 100%': { transform: 'scale3d(1, 1, 1)' },
          '22.2%': { transform: 'skewX(-12.5deg) skewY(-12.5deg)' },
          '33.3%': { transform: 'skewX(6.25deg) skewY(6.25deg)' },
          '44.4%': { transform: 'skewX(-3.125deg) skewY(-3.125deg)' },
          '55.5%': { transform: 'skewX(1.5625deg) skewY(1.5625deg)' },
          '66.6%': { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)' },
          '77.7%': { transform: 'skewX(0.390625deg) skewY(0.390625deg)' },
          '88.8%': { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.3)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.3)' },
          '70%': { transform: 'scale(1)' },
        },
      },
    },
  },
  
  plugins: [
    ...commonPlugins,
    require('tailwindcss-animate'),
    require('@tailwindcss/line-clamp'),
    
    // Development-specific plugins
    function({ addUtilities, addComponents, addBase }) {
      addBase({
        // Development base styles
        'body': {
          '@apply font-sans antialiased': {},
        },
      });
      
      addUtilities({
        '.dev-grid': {
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        },
        '.dev-outline': {
          outline: '2px solid #22c55e',
          outlineOffset: '2px',
        },
        '.dev-center': {
          '@apply flex items-center justify-center': {},
        },
        '.dev-debug': {
          '@apply border-2 border-red-500 bg-red-100': {},
        },
      });
      
      addComponents({
        '.dev-panel': {
          '@apply fixed bottom-4 right-4 bg-dev-100 border border-dev-200 rounded-lg p-4 shadow-lg z-50': {},
        },
        '.dev-badge': {
          '@apply inline-block bg-dev-500 text-white px-2 py-1 rounded text-xs font-semibold': {},
        },
      });
    },
  ],
  
  // Development mode settings
  mode: 'jit',
  safelist: [
    'dev-grid',
    'dev-outline',
    'dev-center',
    'dev-debug',
    'dev-panel',
    'dev-badge',
  ],
};

/**
 * Create environment-specific Tailwind configuration
 */
function createEnvironmentTailwindConfig(environment = 'development', customConfig = {}) {
  let baseEnvConfig;
  
  switch (environment) {
    case 'production':
      baseEnvConfig = productionConfig;
      break;
    case 'staging':
      baseEnvConfig = betaConfig;
      break;
    case 'development':
      baseEnvConfig = developmentConfig;
      break;
    default:
      baseEnvConfig = developmentConfig;
  }
  
  // Merge custom configuration
  return {
    ...baseEnvConfig,
    ...customConfig,
    // Deep merge specific objects
    content: [
      ...baseEnvConfig.content,
      ...(customConfig.content || []),
    ],
    theme: {
      ...baseEnvConfig.theme,
      extend: {
        ...baseEnvConfig.theme.extend,
        ...(customConfig.theme?.extend || {}),
      },
    },
    plugins: [
      ...baseEnvConfig.plugins,
      ...(customConfig.plugins || []),
    ],
  };
}

module.exports = {
  productionConfig,
  betaConfig,
  developmentConfig,
  createEnvironmentTailwindConfig,
};