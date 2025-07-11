/**
 * @fileoverview Shared PostCSS configuration for IOC Core monorepo
 * @description Base PostCSS configuration with Tailwind CSS v4 and Autoprefixer
 */

/**
 * Base PostCSS configuration for Tailwind CSS v4
 * Using the new @tailwindcss/postcss plugin
 */
const baseConfig = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

/**
 * Legacy PostCSS configuration (for Tailwind CSS v3)
 * Kept for backward compatibility if needed
 */
const legacyConfig = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

/**
 * Create environment-specific PostCSS configuration
 * @param {Object} options - Configuration options
 * @param {boolean} options.legacy - Use legacy Tailwind plugin (true for v3, false for v4)
 * @param {Object} options.extend - Additional plugins to merge
 * @returns {Object} Extended PostCSS configuration
 */
function createPostcssConfig(options = {}) {
  const { legacy = false, extend = {} } = options;
  
  // Default to new (v4) config
  const config = legacy ? { ...legacyConfig } : { ...baseConfig };
  
  if (extend.plugins) {
    config.plugins = {
      ...config.plugins,
      ...extend.plugins,
    };
  }
  
  return config;
}

module.exports = {
  baseConfig,
  legacyConfig,
  newConfig: baseConfig, // Alias for clarity
  createPostcssConfig,
  // Export default for direct usage
  default: baseConfig,
};