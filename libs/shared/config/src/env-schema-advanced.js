/**
 * @fileoverview Advanced environment variable schemas with comprehensive validation
 * @description Enterprise-grade environment configuration with type safety, validation, and security
 */

const { z } = require('zod');

/**
 * Custom validators for enhanced security
 */
const secureString = (minLength = 32) => z.string().min(minLength).regex(
  /^[\w\-+=/.]+$/,
  'Must contain only alphanumeric characters, hyphens, underscores, plus, equals, forward slash, and periods'
);

const secureUrl = () => z.string().url().refine(
  (url) => url.startsWith('https://') || url.startsWith('wss://'),
  'Must be a secure URL (https:// or wss://)'
);

const connectionString = () => z.string().refine(
  (str) => {
    try {
      const url = new URL(str);
      return ['postgresql:', 'postgres:', 'mysql:', 'mongodb:', 'redis:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  'Must be a valid database connection string'
);

/**
 * Advanced base environment schema with comprehensive validation
 */
const advancedBaseSchema = z.object({
  // Environment identification
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  DEPLOYMENT_ENV: z.string().optional(),
  DEPLOYMENT_REGION: z.string().optional(),
  DEPLOYMENT_VERSION: z.string().optional(),
  
  // Application metadata (with CI-friendly defaults)
  APP_NAME: z.string().min(1).max(100).default('ioc-core'),
  APP_VERSION: z.string().regex(/^\d+\.\d+\.\d+(-[\w\.]+)?$/).default('0.1.0'),
  APP_DESCRIPTION: z.string().max(500).default('IOC Assessment Platform'),
  APP_BUILD_ID: z.string().optional(),
  APP_BUILD_TIME: z.string().datetime().optional(),
  
  // Service ports and networking
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  METRICS_PORT: z.coerce.number().int().min(1024).max(65535).optional(),
  ADMIN_PORT: z.coerce.number().int().min(1024).max(65535).optional(),
  
  // URLs with enhanced validation
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  API_BASE_URL: z.string().url().optional(),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  
  // Enhanced security configuration
  NEXTAUTH_SECRET: secureString(32),
  ENCRYPTION_KEY: secureString(32).optional(),
  JWT_SECRET: secureString(32).optional(),
  API_KEY_SALT: secureString(16).optional(),
  SESSION_COOKIE_NAME: z.string().default('__ioc_session'),
  SESSION_MAX_AGE: z.coerce.number().int().min(300).default(86400),
  
  // Database configuration with connection pooling (CI-friendly defaults)
  DATABASE_URL: connectionString().default('postgresql://test:test@localhost:5432/test'),
  DATABASE_REPLICA_URL: connectionString().optional(),
  DATABASE_SSL_MODE: z.enum(['disable', 'require', 'verify-ca', 'verify-full']).default('disable'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).max(100).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(1000).default(10),
  DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().int().min(0).default(30000),
  DATABASE_POOL_ACQUIRE_TIMEOUT: z.coerce.number().int().min(1000).default(60000),
  DATABASE_POOL_STATEMENT_TIMEOUT: z.coerce.number().int().min(0).optional(),
  DATABASE_POOL_VALIDATION_TIMEOUT: z.coerce.number().int().min(1000).optional(),
  
  // Redis configuration with clustering support
  REDIS_URL: connectionString().default('redis://localhost:6379'),
  REDIS_CLUSTER_NODES: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: z.string().optional(),
  REDIS_CONNECTION_TIMEOUT: z.coerce.number().int().min(1000).default(5000),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().int().min(1000).default(5000),
  
  // Cache configuration with multiple strategies
  CACHE_STRATEGY: z.enum(['memory', 'redis', 'hybrid']).default('memory'),
  CACHE_TTL_DEFAULT: z.coerce.number().int().min(0).default(300),
  CACHE_TTL_STATIC: z.coerce.number().int().min(0).default(3600),
  CACHE_TTL_DYNAMIC: z.coerce.number().int().min(0).default(300),
  CACHE_TTL_SESSION: z.coerce.number().int().min(0).default(3600),
  CACHE_MAX_SIZE: z.coerce.number().int().min(1).default(1000),
  CACHE_EVICTION_POLICY: z.enum(['lru', 'lfu', 'fifo']).default('lru'),
  
  // Rate limiting with advanced strategies
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: z.coerce.boolean().default(false),
  RATE_LIMIT_SKIP_FAILED_REQUESTS: z.coerce.boolean().default(false),
  RATE_LIMIT_KEY_GENERATOR: z.enum(['ip', 'user', 'api-key', 'custom']).default('ip'),
  RATE_LIMIT_STORE: z.enum(['memory', 'redis', 'database']).default('memory'),
  
  // Security headers and policies
  SECURITY_HEADERS_ENABLED: z.coerce.boolean().default(true),
  CSP_ENABLED: z.coerce.boolean().default(true),
  CSP_REPORT_ONLY: z.coerce.boolean().default(false),
  CSP_REPORT_URI: z.string().url().optional(),
  HSTS_ENABLED: z.coerce.boolean().default(true),
  HSTS_MAX_AGE: z.coerce.number().int().min(0).default(31536000),
  HSTS_INCLUDE_SUBDOMAINS: z.coerce.boolean().default(true),
  HSTS_PRELOAD: z.coerce.boolean().default(false),
  X_FRAME_OPTIONS: z.enum(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).default('DENY'),
  X_CONTENT_TYPE_OPTIONS: z.enum(['nosniff']).default('nosniff'),
  X_XSS_PROTECTION: z.string().default('1; mode=block'),
  REFERRER_POLICY: z.enum([
    'no-referrer',
    'no-referrer-when-downgrade',
    'origin',
    'origin-when-cross-origin',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
  ]).default('strict-origin-when-cross-origin'),
  
  // CORS configuration
  CORS_ENABLED: z.coerce.boolean().default(true),
  CORS_ORIGIN: z.union([z.string(), z.array(z.string())]).default('*'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  CORS_MAX_AGE: z.coerce.number().int().min(0).default(86400),
  
  // Logging and monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text', 'pretty']).default('json'),
  LOG_TIMESTAMP: z.coerce.boolean().default(true),
  LOG_REQUEST_BODY: z.coerce.boolean().default(false),
  LOG_RESPONSE_BODY: z.coerce.boolean().default(false),
  LOG_SENSITIVE_DATA: z.coerce.boolean().default(false),
  
  // Error tracking and APM
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  
  // Performance monitoring
  APM_ENABLED: z.coerce.boolean().default(false),
  APM_SERVICE_NAME: z.string().optional(),
  APM_SERVER_URL: z.string().url().optional(),
  APM_SECRET_TOKEN: z.string().optional(),
  
  // Feature flags with metadata
  FEATURE_FLAGS: z.string().default('{}'),
  FEATURE_FLAGS_PROVIDER: z.enum(['env', 'config', 'remote']).default('env'),
  FEATURE_FLAGS_REMOTE_URL: z.string().url().optional(),
  FEATURE_FLAGS_CACHE_TTL: z.coerce.number().int().min(0).default(300),
  
  // Health checks and monitoring
  HEALTH_CHECK_ENABLED: z.coerce.boolean().default(true),
  HEALTH_CHECK_PATH: z.string().default('/health'),
  HEALTH_CHECK_TOKEN: z.string().optional(),
  HEALTH_CHECK_DATABASE: z.coerce.boolean().default(true),
  HEALTH_CHECK_REDIS: z.coerce.boolean().default(true),
  HEALTH_CHECK_EXTERNAL_APIS: z.coerce.boolean().default(true),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().int().min(1000).default(5000),
  
  // Metrics and observability
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PATH: z.string().default('/metrics'),
  METRICS_AUTH_TOKEN: z.string().optional(),
  METRICS_INCLUDE_DEFAULT: z.coerce.boolean().default(true),
  METRICS_INCLUDE_NODEJS: z.coerce.boolean().default(true),
  
  // API versioning and deprecation
  API_VERSION: z.string().default('v1'),
  API_DEPRECATION_HEADER: z.coerce.boolean().default(true),
  API_SUNSET_HEADER: z.coerce.boolean().default(true),
  
  // Compliance and regulatory
  GDPR_ENABLED: z.coerce.boolean().default(false),
  CCPA_ENABLED: z.coerce.boolean().default(false),
  DATA_RETENTION_DAYS: z.coerce.number().int().min(1).default(365),
  DATA_ANONYMIZATION_ENABLED: z.coerce.boolean().default(false),
  AUDIT_LOG_ENABLED: z.coerce.boolean().default(true),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
});

/**
 * Production environment schema with maximum security
 */
const advancedProductionSchema = advancedBaseSchema.extend({
  NODE_ENV: z.literal('production'),
  
  // Enforce secure URLs
  NEXT_PUBLIC_APP_URL: secureUrl(),
  NEXTAUTH_URL: secureUrl(),
  API_BASE_URL: secureUrl().optional(),
  
  // Stricter security requirements
  NEXTAUTH_SECRET: secureString(64),
  ENCRYPTION_KEY: secureString(64),
  JWT_SECRET: secureString(64),
  SESSION_MAX_AGE: z.coerce.number().int().min(300).max(86400).default(3600),
  
  // Required monitoring in production
  SENTRY_DSN: z.string().url(),
  APM_ENABLED: z.literal(true),
  METRICS_ENABLED: z.literal(true),
  
  // Enforce security headers
  SECURITY_HEADERS_ENABLED: z.literal(true),
  CSP_ENABLED: z.literal(true),
  HSTS_ENABLED: z.literal(true),
  HSTS_PRELOAD: z.literal(true),
  
  // Production database requirements
  DATABASE_SSL_MODE: z.enum(['require', 'verify-ca', 'verify-full']).default('verify-full'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(5).default(10),
  DATABASE_POOL_MAX: z.coerce.number().int().min(20).default(100),
  
  // Strict rate limiting
  RATE_LIMIT_ENABLED: z.literal(true),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(100).default(50),
  
  // Production logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('warn'),
  LOG_SENSITIVE_DATA: z.literal(false),
  
  // Compliance requirements
  GDPR_ENABLED: z.literal(true),
  AUDIT_LOG_ENABLED: z.literal(true),
  
  // Disable debug features
  FEATURE_DEBUG_MODE: z.literal(false),
  LOG_REQUEST_BODY: z.literal(false),
  LOG_RESPONSE_BODY: z.literal(false),
});

/**
 * Beta/Staging environment schema
 */
const advancedBetaSchema = advancedBaseSchema.extend({
  NODE_ENV: z.enum(['staging', 'beta']).default('staging'),
  
  // Allow non-HTTPS URLs for internal testing
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  
  // Relaxed security for testing
  NEXTAUTH_SECRET: secureString(32),
  SESSION_MAX_AGE: z.coerce.number().int().min(300).default(86400),
  
  // Enhanced debugging
  LOG_LEVEL: z.enum(['info', 'debug', 'trace']).default('debug'),
  LOG_REQUEST_BODY: z.coerce.boolean().default(true),
  LOG_RESPONSE_BODY: z.coerce.boolean().default(true),
  
  // Beta features
  FEATURE_DEBUG_MODE: z.coerce.boolean().default(true),
  FEATURE_BETA_TESTING: z.coerce.boolean().default(true),
  FEATURE_EXPERIMENTAL_UI: z.coerce.boolean().default(true),
  
  // Testing configurations
  TEST_MODE_ENABLED: z.coerce.boolean().default(true),
  TEST_USER_CREATION: z.coerce.boolean().default(true),
  MOCK_EXTERNAL_SERVICES: z.coerce.boolean().default(false),
  
  // More lenient rate limiting
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(200),
  
  // Optional monitoring
  SENTRY_DSN: z.string().url().optional(),
  APM_ENABLED: z.coerce.boolean().default(true),
});

/**
 * Development environment schema
 */
const advancedDevelopmentSchema = advancedBaseSchema.extend({
  NODE_ENV: z.literal('development'),
  
  // Allow localhost URLs
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  
  // Development secrets
  NEXTAUTH_SECRET: z.string().min(16).default('dev-secret-change-in-production'),
  
  // Full debugging
  LOG_LEVEL: z.literal('trace'),
  LOG_REQUEST_BODY: z.literal(true),
  LOG_RESPONSE_BODY: z.literal(true),
  FEATURE_DEBUG_MODE: z.literal(true),
  
  // Disable security features for development
  SECURITY_HEADERS_ENABLED: z.coerce.boolean().default(false),
  CSP_ENABLED: z.coerce.boolean().default(false),
  HSTS_ENABLED: z.coerce.boolean().default(false),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(false),
  
  // Development database
  DATABASE_SSL_MODE: z.literal('disable'),
  DATABASE_POOL_MIN: z.coerce.number().int().default(1),
  DATABASE_POOL_MAX: z.coerce.number().int().default(10),
  
  // Optional services
  REDIS_URL: connectionString().optional(),
  SENTRY_DSN: z.string().url().optional(),
  APM_ENABLED: z.coerce.boolean().default(false),
  METRICS_ENABLED: z.coerce.boolean().default(false),
});

/**
 * Test environment schema
 */
const advancedTestSchema = advancedDevelopmentSchema.extend({
  NODE_ENV: z.literal('test'),
  
  // Test-specific overrides
  LOG_LEVEL: z.enum(['error', 'warn']).default('error'),
  DATABASE_URL: z.string().default('postgresql://test:test@localhost:5432/test'),
  REDIS_URL: z.string().optional(),
  
  // Disable external services
  SENTRY_DSN: z.string().optional(),
  APM_ENABLED: z.literal(false),
  METRICS_ENABLED: z.literal(false),
  HEALTH_CHECK_EXTERNAL_APIS: z.literal(false),
});

module.exports = {
  advancedBaseSchema,
  advancedProductionSchema,
  advancedBetaSchema,
  advancedDevelopmentSchema,
  advancedTestSchema,
  
  // Utilities
  secureString,
  secureUrl,
  connectionString,
};