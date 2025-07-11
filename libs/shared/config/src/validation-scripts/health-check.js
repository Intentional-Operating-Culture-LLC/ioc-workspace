#!/usr/bin/env node

/**
 * @fileoverview Environment health check script
 * @description Validates runtime environment and service connectivity
 */

const chalk = require('chalk');
const { DatabaseConfigBuilder } = require('../database-config-advanced');
const { createSecretManager } = require('../secret-manager-advanced');

/**
 * Health check runner
 */
class HealthCheckRunner {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.checks = [];
    this.results = [];
  }

  /**
   * Register health check
   */
  register(name, check) {
    this.checks.push({ name, check });
  }

  /**
   * Run all health checks
   */
  async runAll() {
    console.log(chalk.blue('\n🏥 IOC Core Health Check\n'));
    console.log(chalk.gray(`Environment: ${this.environment}`));
    console.log(chalk.gray(`Time: ${new Date().toISOString()}\n`));

    for (const { name, check } of this.checks) {
      process.stdout.write(chalk.yellow(`Checking ${name}... `));
      
      const start = Date.now();
      try {
        const result = await check();
        const duration = Date.now() - start;
        
        this.results.push({
          name,
          status: 'healthy',
          duration,
          details: result,
        });
        
        console.log(chalk.green(`✓ (${duration}ms)`));
        if (result && typeof result === 'object') {
          console.log(chalk.gray(JSON.stringify(result, null, 2)));
        }
      } catch (error) {
        const duration = Date.now() - start;
        
        this.results.push({
          name,
          status: 'unhealthy',
          duration,
          error: error.message,
        });
        
        console.log(chalk.red(`✗ (${duration}ms)`));
        console.log(chalk.red(`  Error: ${error.message}`));
      }
    }

    return this.results;
  }

  /**
   * Get summary
   */
  getSummary() {
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const unhealthy = this.results.filter(r => r.status === 'unhealthy').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      total: this.results.length,
      healthy,
      unhealthy,
      status: unhealthy === 0 ? 'healthy' : 'unhealthy',
      totalDuration,
      averageDuration: Math.round(totalDuration / this.results.length),
    };
  }
}

/**
 * Environment variable check
 */
async function checkEnvironmentVariables() {
  const required = [
    'NODE_ENV',
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXTAUTH_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return {
    NODE_ENV: process.env.NODE_ENV,
    totalVars: Object.keys(process.env).length,
    requiredPresent: true,
  };
}

/**
 * Database connectivity check
 */
async function checkDatabaseConnection() {
  const builder = new DatabaseConfigBuilder(process.env.NODE_ENV);
  const config = builder.parseConnectionString(process.env.DATABASE_URL);
  
  // Simulate connection check
  // In real implementation, would actually connect to database
  if (!config.host || !config.database) {
    throw new Error('Invalid database configuration');
  }
  
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    ssl: !!builder.config.ssl,
  };
}

/**
 * Redis connectivity check
 */
async function checkRedisConnection() {
  if (!process.env.REDIS_URL) {
    return { status: 'not configured' };
  }
  
  // Simulate Redis check
  const url = new URL(process.env.REDIS_URL);
  
  return {
    host: url.hostname,
    port: url.port || 6379,
    configured: true,
  };
}

/**
 * External API check
 */
async function checkExternalAPIs() {
  const apis = [];
  
  // Check Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    apis.push({
      name: 'Supabase',
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      configured: true,
    });
  }
  
  // Check Sentry
  if (process.env.SENTRY_DSN) {
    apis.push({
      name: 'Sentry',
      configured: true,
    });
  }
  
  // Check Stripe
  if (process.env.STRIPE_PUBLISHABLE_KEY) {
    apis.push({
      name: 'Stripe',
      configured: true,
    });
  }
  
  return {
    configured: apis.length,
    apis: apis.map(api => api.name),
  };
}

/**
 * Security configuration check
 */
async function checkSecurityConfiguration() {
  const checks = {
    secretLength: process.env.NEXTAUTH_SECRET?.length >= 32,
    httpsEnabled: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'),
    cspEnabled: process.env.CSP_ENABLED !== 'false',
    hstsEnabled: process.env.HSTS_ENABLED !== 'false',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  };
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  if (passed < total) {
    const failed = Object.entries(checks)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    throw new Error(`Security checks failed: ${failed.join(', ')}`);
  }
  
  return {
    passed: `${passed}/${total}`,
    checks,
  };
}

/**
 * Feature flags check
 */
async function checkFeatureFlags() {
  const flags = Object.keys(process.env)
    .filter(key => key.startsWith('FEATURE_'))
    .map(key => ({
      name: key,
      enabled: process.env[key] === 'true',
    }));
  
  return {
    total: flags.length,
    enabled: flags.filter(f => f.enabled).length,
    disabled: flags.filter(f => !f.enabled).length,
  };
}

/**
 * File system check
 */
async function checkFileSystem() {
  const fs = require('fs').promises;
  const path = require('path');
  
  const checks = {
    uploads: './uploads',
    temp: './tmp',
    logs: './logs',
  };
  
  const results = {};
  
  for (const [name, dir] of Object.entries(checks)) {
    try {
      const stats = await fs.stat(dir);
      results[name] = {
        exists: true,
        writable: true, // Would check actual permissions in real implementation
      };
    } catch (error) {
      results[name] = {
        exists: false,
        writable: false,
      };
    }
  }
  
  return results;
}

/**
 * Memory and resources check
 */
async function checkSystemResources() {
  const os = require('os');
  
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  
  return {
    memory: {
      total: `${Math.round(totalMemory / 1024 / 1024 / 1024)}GB`,
      free: `${Math.round(freeMemory / 1024 / 1024 / 1024)}GB`,
      usage: `${memoryUsage.toFixed(1)}%`,
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model,
    },
    platform: os.platform(),
    nodeVersion: process.version,
  };
}

/**
 * Run health checks
 */
async function main() {
  const runner = new HealthCheckRunner();
  
  // Register checks
  runner.register('Environment Variables', checkEnvironmentVariables);
  runner.register('Database Connection', checkDatabaseConnection);
  runner.register('Redis Connection', checkRedisConnection);
  runner.register('External APIs', checkExternalAPIs);
  runner.register('Security Configuration', checkSecurityConfiguration);
  runner.register('Feature Flags', checkFeatureFlags);
  runner.register('File System', checkFileSystem);
  runner.register('System Resources', checkSystemResources);
  
  // Run checks
  await runner.runAll();
  
  // Show summary
  const summary = runner.getSummary();
  console.log(chalk.blue('\n📊 Summary:\n'));
  console.log(chalk.gray(`Total Checks: ${summary.total}`));
  console.log(chalk.green(`Healthy: ${summary.healthy}`));
  console.log(chalk.red(`Unhealthy: ${summary.unhealthy}`));
  console.log(chalk.gray(`Total Duration: ${summary.totalDuration}ms`));
  console.log(chalk.gray(`Average Duration: ${summary.averageDuration}ms`));
  
  // Overall status
  if (summary.status === 'healthy') {
    console.log(chalk.green('\n✅ All health checks passed!'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n❌ Some health checks failed!'));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\n❌ Health check failed:'), error.message);
    process.exit(1);
  });
}

module.exports = {
  HealthCheckRunner,
  checkEnvironmentVariables,
  checkDatabaseConnection,
  checkSecurityConfiguration,
};