/**
 * @fileoverview Shared ESLint configuration for IOC Core monorepo
 * @description Base ESLint configuration with Next.js, React, and TypeScript support
 */

/**
 * Base ESLint configuration
 */
const baseConfig = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'next/core-web-vitals',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/display-name': 'warn',
    'react/no-unescaped-entities': 'warn',
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // General code quality rules
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-unused-vars': 'off', // Handled by TypeScript
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Import rules
    'import/no-unresolved': 'off', // Handled by TypeScript
    'import/order': ['warn', {
      'groups': [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
    }],
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    
    // Next.js specific rules
    '@next/next/no-img-element': 'warn',
    '@next/next/no-html-link-for-pages': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'dist/',
    'infrastructure/',
    'archive/',
    'refactoring/',
    'testing/',
    'terraform/',
    'ioc-v3.1.1/',
    'business/',
    'tools/',
    'scripts/',
  ],
};

/**
 * Create environment-specific ESLint configuration
 * @param {Object} options - Configuration options
 * @param {string} options.env - Environment (development, staging, production)
 * @param {Object} options.extend - Additional configuration to merge
 * @returns {Object} Extended ESLint configuration
 */
function createEslintConfig(options = {}) {
  const { env = 'development', extend = {} } = options;
  
  const config = {
    ...baseConfig,
    ...extend,
    rules: {
      ...baseConfig.rules,
      ...extend.rules,
    },
  };
  
  // Environment-specific rules
  if (env === 'development') {
    config.rules['no-console'] = 'off';
    config.rules['no-debugger'] = 'off';
  }
  
  if (env === 'staging') {
    config.rules['no-console'] = 'warn';
    config.rules['@typescript-eslint/no-explicit-any'] = 'off';
    config.rules['@typescript-eslint/no-unused-vars'] = 'off';
  }
  
  if (env === 'production') {
    config.rules['no-console'] = 'error';
    config.rules['no-debugger'] = 'error';
    config.rules['@typescript-eslint/no-explicit-any'] = 'error';
  }
  
  return config;
}

module.exports = {
  baseConfig,
  createEslintConfig,
  // Export default for direct usage
  default: baseConfig,
};