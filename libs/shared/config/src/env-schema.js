/**
 * @fileoverview Environment variable schemas and validation
 * @description Comprehensive environment variable management with type checking and validation
 */

const { z } = require('zod');

/**
 * Base environment schema shared across all environments
 */
const baseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  
  // Application settings
  APP_NAME: z.string().default('IOC Core'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_DESCRIPTION: z.string().default('Intelligence Operations Center'),
  
  // Security settings
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  
  // Database configuration
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
  DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().int().min(1000).default(30000),
  DATABASE_POOL_ACQUIRE_TIMEOUT: z.coerce.number().int().min(1000).default(30000),
  
  // Redis configuration
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  
  // Supabase configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // Storage configuration
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Analytics and monitoring
  SENTRY_DSN: z.string().url().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  HOTJAR_ID: z.string().optional(),
  
  // API keys and integrations
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Feature flags
  FEATURE_AUTH_ENABLED: z.coerce.boolean().default(true),
  FEATURE_PAYMENTS_ENABLED: z.coerce.boolean().default(false),
  FEATURE_ANALYTICS_ENABLED: z.coerce.boolean().default(true),
  FEATURE_MAINTENANCE_MODE: z.coerce.boolean().default(false),
  FEATURE_DEBUG_MODE: z.coerce.boolean().default(false),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
  
  // Security headers
  CSP_ENABLED: z.coerce.boolean().default(true),
  HSTS_ENABLED: z.coerce.boolean().default(true),
  X_FRAME_OPTIONS: z.enum(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).default('DENY'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  
  // Cache configuration
  CACHE_TTL_DEFAULT: z.coerce.number().int().min(0).default(3600),
  CACHE_TTL_STATIC: z.coerce.number().int().min(0).default(86400),
  CACHE_TTL_DYNAMIC: z.coerce.number().int().min(0).default(300),
});

/**
 * Production environment schema with stricter validation
 */
const productionEnvironmentSchema = baseEnvironmentSchema.extend({
  NODE_ENV: z.literal('production'),
  NEXTAUTH_SECRET: z.string().min(64), // Require longer secrets in production
  FEATURE_DEBUG_MODE: z.literal(false), // Debug mode must be disabled
  LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('warn'), // No debug logs in production
  
  // Required in production
  SENTRY_DSN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  
  // Security requirements
  CSP_ENABLED: z.literal(true),
  HSTS_ENABLED: z.literal(true),
  
  // Performance optimizations
  DATABASE_POOL_MIN: z.coerce.number().int().min(5).default(5),
  DATABASE_POOL_MAX: z.coerce.number().int().min(20).default(50),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(50), // Stricter rate limiting
});

/**
 * Beta environment schema with testing features enabled
 */
const betaEnvironmentSchema = baseEnvironmentSchema.extend({
  NODE_ENV: z.enum(['staging', 'development']).default('staging'),
  FEATURE_DEBUG_MODE: z.coerce.boolean().default(true), // Debug mode allowed in beta
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'), // Full logging in beta
  
  // Beta-specific features
  FEATURE_BETA_TESTING: z.coerce.boolean().default(true),
  FEATURE_EXPERIMENTAL_UI: z.coerce.boolean().default(true),
  FEATURE_PERFORMANCE_METRICS: z.coerce.boolean().default(true),
  
  // More lenient rate limiting for testing
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(200),
  
  // Database configuration for testing
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(5).default(20),
});

/**
 * Development environment schema with all features available
 */
const developmentEnvironmentSchema = baseEnvironmentSchema.extend({
  NODE_ENV: z.literal('development'),
  FEATURE_DEBUG_MODE: z.literal(true),
  LOG_LEVEL: z.literal('debug'),
  
  // All features enabled by default in development
  FEATURE_PAYMENTS_ENABLED: z.coerce.boolean().default(true),
  FEATURE_ANALYTICS_ENABLED: z.coerce.boolean().default(true),
  FEATURE_MAINTENANCE_MODE: z.coerce.boolean().default(false),
  
  // Relaxed security for development
  NEXTAUTH_SECRET: z.string().min(16).default('dev-secret-key-change-me'),
  CSP_ENABLED: z.coerce.boolean().default(false),
  HSTS_ENABLED: z.coerce.boolean().default(false),
  
  // High rate limits for development
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(1000),
});

/**
 * Environment schema selector
 */
const environmentSchemas = {
  production: productionEnvironmentSchema,
  beta: betaEnvironmentSchema,
  staging: betaEnvironmentSchema,
  development: developmentEnvironmentSchema,
  test: developmentEnvironmentSchema,
};

/**
 * Validate environment variables based on NODE_ENV
 */
function validateEnvironment(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const schema = environmentSchemas[nodeEnv] || developmentEnvironmentSchema;
  
  try {
    return schema.parse(env);
  } catch (error) {
    console.error('Environment validation failed:', error.errors);
    throw new Error(`Environment validation failed: ${error.message}`);
  }
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig(env = process.env) {
  const validatedEnv = validateEnvironment(env);
  
  return {
    ...validatedEnv,
    isProduction: validatedEnv.NODE_ENV === 'production',
    isBeta: validatedEnv.NODE_ENV === 'staging',
    isDevelopment: validatedEnv.NODE_ENV === 'development',
    isTest: validatedEnv.NODE_ENV === 'test',
    
    // Computed values
    databaseConfig: {
      url: validatedEnv.DATABASE_URL,
      pool: {
        min: validatedEnv.DATABASE_POOL_MIN,
        max: validatedEnv.DATABASE_POOL_MAX,
        idleTimeoutMillis: validatedEnv.DATABASE_POOL_IDLE_TIMEOUT,
        acquireTimeoutMillis: validatedEnv.DATABASE_POOL_ACQUIRE_TIMEOUT,
      },
    },
    
    redisConfig: validatedEnv.REDIS_URL ? {
      url: validatedEnv.REDIS_URL,
      password: validatedEnv.REDIS_PASSWORD,
      db: validatedEnv.REDIS_DB,
    } : null,
    
    rateLimitConfig: {
      windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS,
      max: validatedEnv.RATE_LIMIT_MAX_REQUESTS,
    },
    
    cacheConfig: {
      defaultTTL: validatedEnv.CACHE_TTL_DEFAULT,
      staticTTL: validatedEnv.CACHE_TTL_STATIC,
      dynamicTTL: validatedEnv.CACHE_TTL_DYNAMIC,
    },
    
    securityConfig: {
      cspEnabled: validatedEnv.CSP_ENABLED,
      hstsEnabled: validatedEnv.HSTS_ENABLED,
      xFrameOptions: validatedEnv.X_FRAME_OPTIONS,
    },
    
    featureFlags: {
      auth: validatedEnv.FEATURE_AUTH_ENABLED,
      payments: validatedEnv.FEATURE_PAYMENTS_ENABLED,
      analytics: validatedEnv.FEATURE_ANALYTICS_ENABLED,
      maintenance: validatedEnv.FEATURE_MAINTENANCE_MODE,
      debug: validatedEnv.FEATURE_DEBUG_MODE,
      betaTesting: validatedEnv.FEATURE_BETA_TESTING || false,
      experimentalUI: validatedEnv.FEATURE_EXPERIMENTAL_UI || false,
      performanceMetrics: validatedEnv.FEATURE_PERFORMANCE_METRICS || false,
    },
  };
}

module.exports = {
  baseEnvironmentSchema,
  productionEnvironmentSchema,
  betaEnvironmentSchema,
  developmentEnvironmentSchema,
  environmentSchemas,
  validateEnvironment,
  getEnvironmentConfig,
};