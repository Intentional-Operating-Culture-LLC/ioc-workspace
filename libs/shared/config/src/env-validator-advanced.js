/**
 * @fileoverview Advanced environment validator with comprehensive type checking and validation
 * @description Enterprise-grade environment validation with detailed error reporting
 */

const { z } = require('zod');
const chalk = require('chalk');
const {
  advancedProductionSchema,
  advancedBetaSchema,
  advancedDevelopmentSchema,
  advancedTestSchema,
} = require('./env-schema-advanced');

/**
 * Environment validation result
 */
class ValidationResult {
  constructor(success, data = null, errors = [], warnings = []) {
    this.success = success;
    this.data = data;
    this.errors = errors;
    this.warnings = warnings;
  }

  /**
   * Format validation result for console output
   */
  format() {
    const output = [];
    
    if (this.success) {
      output.push(chalk.green('✓ Environment validation passed'));
      if (this.warnings.length > 0) {
        output.push(chalk.yellow(`\n⚠ ${this.warnings.length} warning(s):`));
        this.warnings.forEach((warning, i) => {
          output.push(chalk.yellow(`  ${i + 1}. ${warning}`));
        });
      }
    } else {
      output.push(chalk.red('✗ Environment validation failed'));
      output.push(chalk.red(`\n${this.errors.length} error(s) found:`));
      this.errors.forEach((error, i) => {
        output.push(chalk.red(`  ${i + 1}. ${error}`));
      });
    }
    
    return output.join('\n');
  }
}

/**
 * Advanced environment validator
 */
class EnvironmentValidator {
  constructor(env = process.env) {
    this.env = env;
    this.schemas = {
      production: advancedProductionSchema,
      staging: advancedBetaSchema,
      beta: advancedBetaSchema,
      development: advancedDevelopmentSchema,
      test: advancedTestSchema,
    };
  }

  /**
   * Validate environment variables
   */
  validate() {
    const errors = [];
    const warnings = [];
    
    // Determine environment
    const nodeEnv = this.env.NODE_ENV || 'development';
    const schema = this.schemas[nodeEnv];
    
    if (!schema) {
      errors.push(`Unknown NODE_ENV: ${nodeEnv}`);
      return new ValidationResult(false, null, errors);
    }
    
    try {
      // Parse with Zod
      const parsed = schema.parse(this.env);
      
      // Additional validation logic
      this._validateSecuritySettings(parsed, errors, warnings);
      this._validateDatabaseSettings(parsed, errors, warnings);
      this._validatePerformanceSettings(parsed, errors, warnings);
      this._validateFeatureFlags(parsed, errors, warnings);
      this._validateDependencies(parsed, errors, warnings);
      
      return new ValidationResult(
        errors.length === 0,
        errors.length === 0 ? parsed : null,
        errors,
        warnings
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors.push(`${path}: ${err.message}`);
        });
      } else {
        errors.push(error.message);
      }
      
      return new ValidationResult(false, null, errors, warnings);
    }
  }

  /**
   * Validate security settings
   */
  _validateSecuritySettings(env, errors, warnings) {
    // Check secret strength
    if (env.NODE_ENV === 'production') {
      if (env.NEXTAUTH_SECRET.length < 64) {
        warnings.push('NEXTAUTH_SECRET should be at least 64 characters in production');
      }
      
      // Check for default values
      if (env.NEXTAUTH_SECRET.includes('change-me') || env.NEXTAUTH_SECRET.includes('default')) {
        errors.push('NEXTAUTH_SECRET contains default values - must be changed for production');
      }
      
      // Validate HTTPS URLs
      const httpsUrls = ['NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL', 'API_BASE_URL'];
      httpsUrls.forEach((key) => {
        if (env[key] && !env[key].startsWith('https://')) {
          errors.push(`${key} must use HTTPS in production`);
        }
      });
      
      // Check rate limiting
      if (!env.RATE_LIMIT_ENABLED) {
        errors.push('Rate limiting must be enabled in production');
      }
    }
    
    // Check session configuration
    if (env.SESSION_MAX_AGE > 86400) {
      warnings.push('SESSION_MAX_AGE is greater than 24 hours - consider reducing for security');
    }
    
    // Validate CORS settings
    if (env.CORS_ENABLED && env.CORS_ORIGIN === '*' && env.NODE_ENV === 'production') {
      warnings.push('CORS is set to allow all origins (*) in production - consider restricting');
    }
  }

  /**
   * Validate database settings
   */
  _validateDatabaseSettings(env, errors, warnings) {
    // Check connection pooling
    if (env.DATABASE_POOL_MAX < env.DATABASE_POOL_MIN) {
      errors.push('DATABASE_POOL_MAX must be greater than or equal to DATABASE_POOL_MIN');
    }
    
    // Production database checks
    if (env.NODE_ENV === 'production') {
      if (env.DATABASE_SSL_MODE === 'disable') {
        errors.push('DATABASE_SSL_MODE must not be "disable" in production');
      }
      
      if (env.DATABASE_POOL_MAX < 20) {
        warnings.push('DATABASE_POOL_MAX is low for production - consider increasing');
      }
      
      if (!env.DATABASE_REPLICA_URL) {
        warnings.push('No DATABASE_REPLICA_URL configured - consider adding read replicas for production');
      }
    }
    
    // Validate timeouts
    if (env.DATABASE_POOL_IDLE_TIMEOUT < 10000) {
      warnings.push('DATABASE_POOL_IDLE_TIMEOUT is very low - may cause excessive reconnections');
    }
    
    if (env.DATABASE_POOL_ACQUIRE_TIMEOUT > 30000) {
      warnings.push('DATABASE_POOL_ACQUIRE_TIMEOUT is high - may cause slow request handling');
    }
  }

  /**
   * Validate performance settings
   */
  _validatePerformanceSettings(env, errors, warnings) {
    // Cache configuration
    if (env.CACHE_STRATEGY === 'memory' && env.NODE_ENV === 'production') {
      warnings.push('Using memory cache in production - consider Redis for distributed caching');
    }
    
    if (env.CACHE_TTL_DEFAULT < 60) {
      warnings.push('CACHE_TTL_DEFAULT is very low - may impact performance');
    }
    
    // Rate limiting configuration
    if (env.RATE_LIMIT_ENABLED && env.RATE_LIMIT_STORE === 'memory' && env.NODE_ENV === 'production') {
      warnings.push('Rate limiting using memory store - not suitable for distributed deployments');
    }
    
    // Redis configuration
    if (env.REDIS_URL && !env.REDIS_TLS_ENABLED && env.NODE_ENV === 'production') {
      warnings.push('Redis TLS is disabled in production - consider enabling for security');
    }
  }

  /**
   * Validate feature flags
   */
  _validateFeatureFlags(env, errors, warnings) {
    // Check for debug mode in production
    if (env.NODE_ENV === 'production' && env.FEATURE_DEBUG_MODE) {
      errors.push('FEATURE_DEBUG_MODE must be disabled in production');
    }
    
    // Check experimental features in production
    const experimentalFlags = [
      'FEATURE_BETA_TESTING',
      'FEATURE_EXPERIMENTAL_UI',
      'TEST_MODE_ENABLED',
      'TEST_USER_CREATION',
    ];
    
    if (env.NODE_ENV === 'production') {
      experimentalFlags.forEach((flag) => {
        if (env[flag]) {
          warnings.push(`${flag} is enabled in production - ensure this is intentional`);
        }
      });
    }
    
    // Validate feature flag provider
    if (env.FEATURE_FLAGS_PROVIDER === 'remote' && !env.FEATURE_FLAGS_REMOTE_URL) {
      errors.push('FEATURE_FLAGS_REMOTE_URL must be set when using remote feature flags');
    }
  }

  /**
   * Validate service dependencies
   */
  _validateDependencies(env, errors, warnings) {
    // Check monitoring setup
    if (env.NODE_ENV === 'production') {
      if (!env.SENTRY_DSN) {
        errors.push('SENTRY_DSN is required for production error tracking');
      }
      
      if (!env.APM_ENABLED) {
        warnings.push('APM is disabled - consider enabling for production monitoring');
      }
      
      if (!env.METRICS_ENABLED) {
        warnings.push('Metrics are disabled - consider enabling for production observability');
      }
    }
    
    // Check health check configuration
    if (env.HEALTH_CHECK_ENABLED && !env.HEALTH_CHECK_TOKEN && env.NODE_ENV === 'production') {
      warnings.push('Health check endpoint has no authentication token - consider adding for security');
    }
    
    // Check backup configuration
    if (env.NODE_ENV === 'production' && !env.BACKUP_ENABLED) {
      warnings.push('Backups are disabled in production - ensure this is intentional');
    }
  }

  /**
   * Get environment summary
   */
  getSummary() {
    const env = this.env;
    const nodeEnv = env.NODE_ENV || 'development';
    
    return {
      environment: nodeEnv,
      app: {
        name: env.APP_NAME,
        version: env.APP_VERSION,
        url: env.NEXT_PUBLIC_APP_URL,
      },
      security: {
        csp: env.CSP_ENABLED,
        hsts: env.HSTS_ENABLED,
        rateLimiting: env.RATE_LIMIT_ENABLED,
      },
      database: {
        ssl: env.DATABASE_SSL_MODE,
        poolSize: `${env.DATABASE_POOL_MIN}-${env.DATABASE_POOL_MAX}`,
        replica: !!env.DATABASE_REPLICA_URL,
      },
      cache: {
        strategy: env.CACHE_STRATEGY,
        redis: !!env.REDIS_URL,
      },
      monitoring: {
        sentry: !!env.SENTRY_DSN,
        apm: env.APM_ENABLED,
        metrics: env.METRICS_ENABLED,
      },
      features: {
        auth: env.FEATURE_AUTH_ENABLED,
        payments: env.FEATURE_PAYMENTS_ENABLED,
        debug: env.FEATURE_DEBUG_MODE,
      },
    };
  }
}

/**
 * Validate current environment
 */
function validateEnvironment(env = process.env) {
  const validator = new EnvironmentValidator(env);
  return validator.validate();
}

/**
 * CLI validation script
 */
if (require.main === module) {
  console.log(chalk.blue('\n🔍 Validating environment configuration...\n'));
  
  const validator = new EnvironmentValidator();
  const result = validator.validate();
  
  console.log(result.format());
  
  if (result.success) {
    console.log(chalk.blue('\n📊 Environment Summary:'));
    console.log(JSON.stringify(validator.getSummary(), null, 2));
  }
  
  process.exit(result.success ? 0 : 1);
}

module.exports = {
  EnvironmentValidator,
  ValidationResult,
  validateEnvironment,
};