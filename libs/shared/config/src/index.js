/**
 * @fileoverview Main configuration package exports
 * @description Centralized configuration management for IOC Core
 */

// Environment configuration
const {
  baseEnvironmentSchema,
  productionEnvironmentSchema,
  betaEnvironmentSchema,
  developmentEnvironmentSchema,
  validateEnvironment,
  getEnvironmentConfig,
} = require('./env-schema');

const {
  advancedBaseSchema,
  advancedProductionSchema,
  advancedBetaSchema,
  advancedDevelopmentSchema,
  advancedTestSchema,
} = require('./env-schema-advanced');

const {
  EnvironmentValidator,
  ValidationResult,
  validateEnvironment: validateEnvironmentAdvanced,
} = require('./env-validator-advanced');

// Feature flags
const {
  FEATURE_FLAGS,
  FeatureFlagManager,
  createFeatureFlagManager,
} = require('./feature-flags-advanced');

// Secret management
const {
  SecretManager,
  SecretProvider,
  EnvironmentSecretProvider,
  FileSecretProvider,
  createSecretManager,
} = require('./secret-manager-advanced');

// Database configuration
const {
  DatabaseConfigBuilder,
  DatabaseConnectionManager,
  createDatabaseConfig,
  createDatabaseManager,
} = require('./database-config-advanced');

// Security configuration
const {
  CSPBuilder,
  SecurityHeadersConfig,
  SecurityConfigManager,
  createSecurityConfig,
} = require('./security-config-advanced');

// Build configurations
const nextConfig = require('./next.config');
const nextConfigEnv = require('./next-config-env');
const tailwindConfig = require('./tailwind.config');
const tailwindConfigEnv = require('./tailwind-config-env');
const postcssConfig = require('./postcss.config');
const eslintConfig = require('./eslint.config');

// Brand colors
const brandColors = require('./brand-colors');

// Utilities
const utils = require('./utils');
const version = require('./version');

/**
 * Get complete configuration for environment
 */
function getConfig(environment = process.env.NODE_ENV || 'development') {
  // Validate environment
  const validator = new EnvironmentValidator(process.env);
  const validationResult = validator.validate();
  
  if (!validationResult.success) {
    console.error('Environment validation failed:', validationResult.errors);
    if (environment === 'production') {
      throw new Error('Environment validation failed in production');
    }
  }
  
  return {
    environment,
    env: getEnvironmentConfig(process.env),
    features: createFeatureFlagManager(environment),
    security: createSecurityConfig(environment),
    database: createDatabaseConfig(environment),
    secrets: createSecretManager(environment),
    build: {
      next: nextConfigEnv(environment),
      tailwind: tailwindConfigEnv(environment),
      postcss: postcssConfig,
      eslint: eslintConfig,
    },
    brand: brandColors,
    validation: validationResult,
    version: version.getVersionInfo(),
  };
}

/**
 * Initialize configuration
 */
function initialize(options = {}) {
  const environment = options.environment || process.env.NODE_ENV || 'development';
  
  // Set up global configuration
  global.__iocConfig = getConfig(environment);
  
  // Set up error handling for production
  if (environment === 'production') {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Send to monitoring service
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Send to monitoring service
      process.exit(1);
    });
  }
  
  return global.__iocConfig;
}

module.exports = {
  // Main functions
  getConfig,
  initialize,
  
  // Environment
  validateEnvironment,
  validateEnvironmentAdvanced,
  getEnvironmentConfig,
  EnvironmentValidator,
  ValidationResult,
  
  // Schemas
  schemas: {
    base: baseEnvironmentSchema,
    production: productionEnvironmentSchema,
    beta: betaEnvironmentSchema,
    development: developmentEnvironmentSchema,
    advanced: {
      base: advancedBaseSchema,
      production: advancedProductionSchema,
      beta: advancedBetaSchema,
      development: advancedDevelopmentSchema,
      test: advancedTestSchema,
    },
  },
  
  // Feature flags
  FEATURE_FLAGS,
  FeatureFlagManager,
  createFeatureFlagManager,
  
  // Secret management
  SecretManager,
  SecretProvider,
  EnvironmentSecretProvider,
  FileSecretProvider,
  createSecretManager,
  
  // Database
  DatabaseConfigBuilder,
  DatabaseConnectionManager,
  createDatabaseConfig,
  createDatabaseManager,
  
  // Security
  CSPBuilder,
  SecurityHeadersConfig,
  SecurityConfigManager,
  createSecurityConfig,
  
  // Build configurations
  nextConfig,
  nextConfigEnv,
  tailwindConfig,
  tailwindConfigEnv,
  postcssConfig,
  eslintConfig,
  
  // Utilities
  brandColors,
  utils,
  version,
};