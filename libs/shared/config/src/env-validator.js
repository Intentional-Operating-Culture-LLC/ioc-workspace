/**
 * @fileoverview Environment validation utilities and runtime checks
 * @description Provides runtime environment validation and type checking
 */

const { validateEnvironment, getEnvironmentConfig } = require('./env-schema');
const fs = require('fs');
const path = require('path');

/**
 * Environment validation error class
 */
class EnvironmentValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'EnvironmentValidationError';
    this.errors = errors;
  }
}

/**
 * Environment health check results
 */
class EnvironmentHealthCheck {
  constructor() {
    this.checks = [];
    this.warnings = [];
    this.errors = [];
    this.isValid = true;
  }

  addCheck(name, status, message, value = null) {
    this.checks.push({ name, status, message, value, timestamp: new Date() });
    if (status === 'error') {
      this.errors.push({ name, message, value });
      this.isValid = false;
    } else if (status === 'warning') {
      this.warnings.push({ name, message, value });
    }
  }

  getReport() {
    return {
      isValid: this.isValid,
      timestamp: new Date(),
      summary: {
        total: this.checks.length,
        passed: this.checks.filter(c => c.status === 'success').length,
        warnings: this.warnings.length,
        errors: this.errors.length,
      },
      checks: this.checks,
      warnings: this.warnings,
      errors: this.errors,
    };
  }
}

/**
 * Validate environment variables with detailed reporting
 */
function validateEnvironmentWithReport(env = process.env) {
  const healthCheck = new EnvironmentHealthCheck();
  
  try {
    // Basic environment validation
    const validatedEnv = validateEnvironment(env);
    healthCheck.addCheck('schema_validation', 'success', 'Environment schema validation passed');
    
    // Check required environment variables
    const requiredVars = [
      'NODE_ENV',
      'NEXT_PUBLIC_APP_URL',
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    
    for (const varName of requiredVars) {
      if (validatedEnv[varName]) {
        healthCheck.addCheck(
          `required_var_${varName}`,
          'success',
          `Required variable ${varName} is present`,
          typeof validatedEnv[varName] === 'string' ? '[REDACTED]' : validatedEnv[varName]
        );
      } else {
        healthCheck.addCheck(
          `required_var_${varName}`,
          'error',
          `Required variable ${varName} is missing`
        );
      }
    }
    
    // Environment-specific validations
    if (validatedEnv.NODE_ENV === 'production') {
      validateProductionEnvironment(validatedEnv, healthCheck);
    } else if (validatedEnv.NODE_ENV === 'staging') {
      validateBetaEnvironment(validatedEnv, healthCheck);
    } else {
      validateDevelopmentEnvironment(validatedEnv, healthCheck);
    }
    
    // Security validations
    validateSecurityConfiguration(validatedEnv, healthCheck);
    
    // Performance validations
    validatePerformanceConfiguration(validatedEnv, healthCheck);
    
    // Feature flag validations
    validateFeatureFlags(validatedEnv, healthCheck);
    
    return {
      isValid: healthCheck.isValid,
      config: getEnvironmentConfig(validatedEnv),
      report: healthCheck.getReport(),
    };
    
  } catch (error) {
    healthCheck.addCheck('validation_error', 'error', `Environment validation failed: ${error.message}`);
    return {
      isValid: false,
      config: null,
      report: healthCheck.getReport(),
      error: error.message,
    };
  }
}

/**
 * Validate production environment specific requirements
 */
function validateProductionEnvironment(env, healthCheck) {
  // Security requirements
  if (env.NEXTAUTH_SECRET.length < 64) {
    healthCheck.addCheck(
      'production_auth_secret',
      'error',
      'Production environment requires NEXTAUTH_SECRET to be at least 64 characters'
    );
  }
  
  if (env.FEATURE_DEBUG_MODE) {
    healthCheck.addCheck(
      'production_debug_mode',
      'error',
      'Debug mode must be disabled in production'
    );
  }
  
  if (!env.SENTRY_DSN) {
    healthCheck.addCheck(
      'production_monitoring',
      'error',
      'Production environment requires SENTRY_DSN for error monitoring'
    );
  }
  
  if (!env.REDIS_URL) {
    healthCheck.addCheck(
      'production_redis',
      'error',
      'Production environment requires REDIS_URL for caching'
    );
  }
  
  // Performance requirements
  if (env.DATABASE_POOL_MAX < 20) {
    healthCheck.addCheck(
      'production_db_pool',
      'warning',
      'Production database pool should have at least 20 connections',
      env.DATABASE_POOL_MAX
    );
  }
  
  if (env.RATE_LIMIT_MAX_REQUESTS > 100) {
    healthCheck.addCheck(
      'production_rate_limit',
      'warning',
      'Production rate limit should be stricter (≤100 requests)',
      env.RATE_LIMIT_MAX_REQUESTS
    );
  }
  
  healthCheck.addCheck('production_validation', 'success', 'Production environment validation completed');
}

/**
 * Validate beta environment specific requirements
 */
function validateBetaEnvironment(env, healthCheck) {
  // Beta testing features
  if (!env.FEATURE_BETA_TESTING) {
    healthCheck.addCheck(
      'beta_testing_feature',
      'warning',
      'Beta testing features should be enabled in beta environment'
    );
  }
  
  // Debug capabilities
  if (env.LOG_LEVEL !== 'debug') {
    healthCheck.addCheck(
      'beta_logging',
      'warning',
      'Beta environment should use debug logging for better troubleshooting'
    );
  }
  
  // Performance metrics
  if (!env.FEATURE_PERFORMANCE_METRICS) {
    healthCheck.addCheck(
      'beta_performance_metrics',
      'warning',
      'Performance metrics should be enabled in beta environment'
    );
  }
  
  healthCheck.addCheck('beta_validation', 'success', 'Beta environment validation completed');
}

/**
 * Validate development environment
 */
function validateDevelopmentEnvironment(env, healthCheck) {
  // Development features
  if (!env.FEATURE_DEBUG_MODE) {
    healthCheck.addCheck(
      'dev_debug_mode',
      'warning',
      'Debug mode should be enabled in development'
    );
  }
  
  // Security warnings for development
  if (env.CSP_ENABLED && env.NODE_ENV === 'development') {
    healthCheck.addCheck(
      'dev_csp',
      'warning',
      'CSP is enabled in development, may cause issues with hot reloading'
    );
  }
  
  healthCheck.addCheck('development_validation', 'success', 'Development environment validation completed');
}

/**
 * Validate security configuration
 */
function validateSecurityConfiguration(env, healthCheck) {
  // URL validation
  try {
    new URL(env.NEXT_PUBLIC_APP_URL);
    healthCheck.addCheck('security_app_url', 'success', 'App URL is valid');
  } catch {
    healthCheck.addCheck('security_app_url', 'error', 'App URL is invalid');
  }
  
  // Secret strength validation
  if (env.NEXTAUTH_SECRET === 'dev-secret-key-change-me' && env.NODE_ENV !== 'development') {
    healthCheck.addCheck(
      'security_default_secret',
      'error',
      'Default secret detected in non-development environment'
    );
  }
  
  // HTTPS enforcement
  if (env.NODE_ENV === 'production' && !env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
    healthCheck.addCheck(
      'security_https',
      'error',
      'Production environment must use HTTPS'
    );
  }
  
  // Security headers
  if (env.NODE_ENV === 'production') {
    if (!env.CSP_ENABLED) {
      healthCheck.addCheck(
        'security_csp',
        'warning',
        'Content Security Policy should be enabled in production'
      );
    }
    
    if (!env.HSTS_ENABLED) {
      healthCheck.addCheck(
        'security_hsts',
        'warning',
        'HTTP Strict Transport Security should be enabled in production'
      );
    }
  }
  
  healthCheck.addCheck('security_validation', 'success', 'Security configuration validation completed');
}

/**
 * Validate performance configuration
 */
function validatePerformanceConfiguration(env, healthCheck) {
  // Database pool configuration
  if (env.DATABASE_POOL_MAX < env.DATABASE_POOL_MIN) {
    healthCheck.addCheck(
      'performance_db_pool',
      'error',
      'Database pool max must be greater than min'
    );
  }
  
  // Cache TTL validation
  if (env.CACHE_TTL_STATIC < env.CACHE_TTL_DYNAMIC) {
    healthCheck.addCheck(
      'performance_cache_ttl',
      'warning',
      'Static cache TTL should be longer than dynamic cache TTL'
    );
  }
  
  // Rate limiting
  if (env.RATE_LIMIT_WINDOW_MS < 60000) {
    healthCheck.addCheck(
      'performance_rate_limit_window',
      'warning',
      'Rate limit window should be at least 60 seconds'
    );
  }
  
  healthCheck.addCheck('performance_validation', 'success', 'Performance configuration validation completed');
}

/**
 * Validate feature flags
 */
function validateFeatureFlags(env, healthCheck) {
  // Conflicting feature flags
  if (env.FEATURE_MAINTENANCE_MODE && env.FEATURE_PAYMENTS_ENABLED) {
    healthCheck.addCheck(
      'feature_maintenance_conflict',
      'warning',
      'Payments should be disabled during maintenance mode'
    );
  }
  
  // Production feature flags
  if (env.NODE_ENV === 'production' && env.FEATURE_DEBUG_MODE) {
    healthCheck.addCheck(
      'feature_debug_production',
      'error',
      'Debug mode should not be enabled in production'
    );
  }
  
  healthCheck.addCheck('feature_flags_validation', 'success', 'Feature flags validation completed');
}

/**
 * Load and validate environment from file
 */
function loadEnvironmentFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new EnvironmentValidationError(`Environment file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  // Parse .env file format
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key] = valueParts.join('=');
      }
    }
  });
  
  return validateEnvironmentWithReport(env);
}

/**
 * Generate environment validation report
 */
function generateValidationReport(results) {
  const report = results.report;
  const lines = [];
  
  lines.push('# Environment Validation Report');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push(`Status: ${report.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push(`- Total checks: ${report.summary.total}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Errors: ${report.summary.errors}`);
  lines.push('');
  
  // Errors
  if (report.errors.length > 0) {
    lines.push('## Errors');
    report.errors.forEach(error => {
      lines.push(`- ❌ ${error.name}: ${error.message}`);
    });
    lines.push('');
  }
  
  // Warnings
  if (report.warnings.length > 0) {
    lines.push('## Warnings');
    report.warnings.forEach(warning => {
      lines.push(`- ⚠️ ${warning.name}: ${warning.message}`);
    });
    lines.push('');
  }
  
  // All checks
  lines.push('## All Checks');
  report.checks.forEach(check => {
    const icon = check.status === 'success' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    lines.push(`- ${icon} ${check.name}: ${check.message}`);
  });
  
  return lines.join('\n');
}

module.exports = {
  EnvironmentValidationError,
  EnvironmentHealthCheck,
  validateEnvironmentWithReport,
  validateProductionEnvironment,
  validateBetaEnvironment,
  validateDevelopmentEnvironment,
  validateSecurityConfiguration,
  validatePerformanceConfiguration,
  validateFeatureFlags,
  loadEnvironmentFromFile,
  generateValidationReport,
};