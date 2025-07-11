/**
 * @fileoverview Utility functions for IOC Core shared configurations
 * @description Helper functions for extending and merging configurations
 */

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Merge array configurations
 * @param {Array} base - Base array
 * @param {Array} extend - Array to merge
 * @returns {Array} Merged array
 */
function mergeArrays(base = [], extend = []) {
  return [...base, ...extend];
}

/**
 * Get environment-specific configuration
 * @param {string} env - Environment name
 * @returns {Object} Environment configuration
 */
function getEnvConfig(env) {
  const configs = {
    development: {
      isDev: true,
      isProduction: false,
      isStaging: false,
    },
    staging: {
      isDev: false,
      isProduction: false,
      isStaging: true,
    },
    production: {
      isDev: false,
      isProduction: true,
      isStaging: false,
    },
  };
  
  return configs[env] || configs.development;
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @param {string} type - Configuration type (next, tailwind, typescript, eslint)
 * @returns {boolean} Whether configuration is valid
 */
function validateConfig(config, type) {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  switch (type) {
    case 'next':
      return typeof config.reactStrictMode === 'boolean';
    case 'tailwind':
      return config.content && Array.isArray(config.content);
    case 'typescript':
      return config.compilerOptions && typeof config.compilerOptions === 'object';
    case 'eslint':
      return config.rules && typeof config.rules === 'object';
    default:
      return true;
  }
}

/**
 * Create configuration with environment overrides
 * @param {Object} baseConfig - Base configuration
 * @param {Object} envOverrides - Environment-specific overrides
 * @param {string} env - Current environment
 * @returns {Object} Final configuration
 */
function createConfigWithEnvOverrides(baseConfig, envOverrides, env) {
  const envConfig = envOverrides[env] || {};
  return deepMerge(baseConfig, envConfig);
}

module.exports = {
  deepMerge,
  mergeArrays,
  getEnvConfig,
  validateConfig,
  createConfigWithEnvOverrides,
};