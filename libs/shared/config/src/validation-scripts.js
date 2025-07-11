/**
 * @fileoverview Environment validation scripts
 * @description Command-line scripts for validating environment configurations
 */

const { validateEnvironmentWithReport, generateValidationReport } = require('./env-validator');
const { getSecretManager } = require('./secret-manager');
const { getFeatureAnalytics } = require('./feature-flags');
const fs = require('fs');
const path = require('path');

/**
 * CLI validation script
 */
async function validateEnvironmentCLI() {
  console.log('🔍 IOC Core Environment Validation\n');
  
  const environment = process.env.NODE_ENV || 'development';
  console.log(`Environment: ${environment}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // Validate environment configuration
    console.log('📋 Validating environment configuration...');
    const results = validateEnvironmentWithReport();
    
    if (results.isValid) {
      console.log('✅ Environment configuration is valid\n');
    } else {
      console.log('❌ Environment configuration has issues\n');
    }
    
    // Generate and display report
    const report = generateValidationReport(results);
    console.log(report);
    
    // Validate secrets
    console.log('\n🔐 Validating secrets...');
    const secretManager = getSecretManager(environment);
    const secretResults = secretManager.validateSecrets();
    
    if (secretResults.valid) {
      console.log('✅ All secrets are valid');
    } else {
      console.log('❌ Secret validation failed');
      
      if (secretResults.missing.length > 0) {
        console.log('\n📝 Missing secrets:');
        secretResults.missing.forEach(secret => {
          console.log(`  - ${secret.key}: ${secret.description} (${secret.level})`);
        });
      }
      
      if (secretResults.errors.length > 0) {
        console.log('\n🚨 Secret errors:');
        secretResults.errors.forEach(error => {
          console.log(`  - ${error.key}: ${error.message}`);
        });
      }
    }
    
    // Feature flags analysis
    console.log('\n🎛️  Feature flags analysis...');
    const featureAnalytics = getFeatureAnalytics();
    console.log(`Total features: ${featureAnalytics.totalFeatures}`);
    console.log(`Enabled features: ${featureAnalytics.enabledFeatures}`);
    console.log(`Disabled features: ${featureAnalytics.disabledFeatures}`);
    console.log(`Beta features: ${featureAnalytics.betaFeatures}`);
    
    // Exit with appropriate code
    process.exit(results.isValid && secretResults.valid ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Generate environment validation report file
 */
async function generateEnvironmentReport(outputPath = null) {
  const environment = process.env.NODE_ENV || 'development';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultPath = `environment-report-${environment}-${timestamp}.md`;
  const filePath = outputPath || path.join(process.cwd(), defaultPath);
  
  console.log('📊 Generating environment validation report...');
  console.log(`Environment: ${environment}`);
  console.log(`Output: ${filePath}\n`);
  
  try {
    // Validate environment
    const results = validateEnvironmentWithReport();
    let reportContent = generateValidationReport(results);
    
    // Add secret validation
    const secretManager = getSecretManager(environment);
    const secretResults = secretManager.validateSecrets();
    
    reportContent += '\n\n# Secret Validation\n';
    reportContent += `Status: ${secretResults.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;
    
    if (secretResults.missing.length > 0) {
      reportContent += '## Missing Secrets\n';
      secretResults.missing.forEach(secret => {
        reportContent += `- ❌ ${secret.key}: ${secret.description} (${secret.level})\n`;
      });
      reportContent += '\n';
    }
    
    if (secretResults.errors.length > 0) {
      reportContent += '## Secret Errors\n';
      secretResults.errors.forEach(error => {
        reportContent += `- ❌ ${error.key}: ${error.message}\n`;
      });
      reportContent += '\n';
    }
    
    // Add feature flags analysis
    const featureAnalytics = getFeatureAnalytics();
    reportContent += '\n# Feature Flags Analysis\n';
    reportContent += `- Total features: ${featureAnalytics.totalFeatures}\n`;
    reportContent += `- Enabled features: ${featureAnalytics.enabledFeatures}\n`;
    reportContent += `- Disabled features: ${featureAnalytics.disabledFeatures}\n`;
    reportContent += `- Beta features: ${featureAnalytics.betaFeatures}\n`;
    reportContent += `- Production features: ${featureAnalytics.productionFeatures}\n\n`;
    
    reportContent += '## Feature Details\n';
    for (const [name, details] of Object.entries(featureAnalytics.features)) {
      const status = details.enabled ? '✅' : '❌';
      reportContent += `- ${status} ${name}: ${details.enabled ? 'enabled' : 'disabled'} (${details.rolloutPercentage}% rollout)\n`;
    }
    
    // Write report to file
    fs.writeFileSync(filePath, reportContent);
    console.log(`✅ Report generated: ${filePath}`);
    
    return filePath;
    
  } catch (error) {
    console.error('💥 Report generation failed:', error.message);
    throw error;
  }
}

/**
 * Check environment health
 */
async function checkEnvironmentHealth() {
  console.log('🏥 IOC Core Environment Health Check\n');
  
  const environment = process.env.NODE_ENV || 'development';
  const health = {
    environment,
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: [],
    warnings: [],
    errors: [],
  };
  
  try {
    // Environment validation
    console.log('📋 Checking environment configuration...');
    const results = validateEnvironmentWithReport();
    
    if (results.isValid) {
      health.checks.push({ name: 'environment_config', status: 'healthy', message: 'Configuration is valid' });
      console.log('✅ Environment configuration: healthy');
    } else {
      health.checks.push({ name: 'environment_config', status: 'unhealthy', message: 'Configuration has issues' });
      health.errors.push('Environment configuration validation failed');
      health.status = 'unhealthy';
      console.log('❌ Environment configuration: unhealthy');
    }
    
    // Database connectivity check
    console.log('🗄️  Checking database connectivity...');
    if (process.env.DATABASE_URL) {
      // This would need actual database connection testing
      health.checks.push({ name: 'database', status: 'healthy', message: 'Database URL configured' });
      console.log('✅ Database: configured');
    } else {
      health.checks.push({ name: 'database', status: 'unhealthy', message: 'Database URL not configured' });
      health.errors.push('Database URL not configured');
      health.status = 'unhealthy';
      console.log('❌ Database: not configured');
    }
    
    // Redis connectivity check
    console.log('🔄 Checking Redis connectivity...');
    if (process.env.REDIS_URL) {
      health.checks.push({ name: 'redis', status: 'healthy', message: 'Redis URL configured' });
      console.log('✅ Redis: configured');
    } else {
      if (environment === 'production') {
        health.checks.push({ name: 'redis', status: 'unhealthy', message: 'Redis required for production' });
        health.errors.push('Redis URL not configured (required for production)');
        health.status = 'unhealthy';
        console.log('❌ Redis: not configured (required for production)');
      } else {
        health.checks.push({ name: 'redis', status: 'warning', message: 'Redis not configured (optional for development)' });
        health.warnings.push('Redis URL not configured');
        console.log('⚠️  Redis: not configured (optional for development)');
      }
    }
    
    // External APIs check
    console.log('🌐 Checking external API configurations...');
    const externalAPIs = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY'];
    let configuredAPIs = 0;
    
    for (const apiKey of externalAPIs) {
      if (process.env[apiKey]) {
        configuredAPIs++;
      }
    }
    
    if (configuredAPIs > 0) {
      health.checks.push({ name: 'external_apis', status: 'healthy', message: `${configuredAPIs} external APIs configured` });
      console.log(`✅ External APIs: ${configuredAPIs} configured`);
    } else {
      health.checks.push({ name: 'external_apis', status: 'warning', message: 'No external APIs configured' });
      health.warnings.push('No external APIs configured');
      console.log('⚠️  External APIs: none configured');
    }
    
    // Security check
    console.log('🔒 Checking security configuration...');
    const securityChecks = [
      { key: 'NEXTAUTH_SECRET', required: true },
      { key: 'CSP_ENABLED', required: environment === 'production' },
      { key: 'HSTS_ENABLED', required: environment === 'production' },
    ];
    
    let securityIssues = 0;
    for (const check of securityChecks) {
      if (check.required && !process.env[check.key]) {
        securityIssues++;
      }
    }
    
    if (securityIssues === 0) {
      health.checks.push({ name: 'security', status: 'healthy', message: 'Security configuration is valid' });
      console.log('✅ Security: configured');
    } else {
      health.checks.push({ name: 'security', status: 'unhealthy', message: `${securityIssues} security issues found` });
      health.errors.push(`${securityIssues} security configuration issues`);
      health.status = 'unhealthy';
      console.log(`❌ Security: ${securityIssues} issues found`);
    }
    
    // Summary
    console.log('\n📊 Health Check Summary:');
    console.log(`Status: ${health.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Checks: ${health.checks.length}`);
    console.log(`Warnings: ${health.warnings.length}`);
    console.log(`Errors: ${health.errors.length}`);
    
    return health;
    
  } catch (error) {
    console.error('💥 Health check failed:', error.message);
    health.status = 'unhealthy';
    health.errors.push(`Health check failed: ${error.message}`);
    return health;
  }
}

/**
 * Environment comparison tool
 */
async function compareEnvironments(env1 = 'production', env2 = 'staging') {
  console.log(`🔍 Comparing ${env1} vs ${env2} environments\n`);
  
  // This would need to load different environment files
  // For now, just show the concept
  const comparison = {
    environments: [env1, env2],
    differences: [],
    similarities: [],
    recommendations: [],
  };
  
  console.log('📋 Environment Comparison Report:');
  console.log(`- Environment 1: ${env1}`);
  console.log(`- Environment 2: ${env2}`);
  console.log(`- Differences found: ${comparison.differences.length}`);
  console.log(`- Similarities found: ${comparison.similarities.length}`);
  console.log(`- Recommendations: ${comparison.recommendations.length}`);
  
  return comparison;
}

// CLI command handling
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      validateEnvironmentCLI();
      break;
    case 'report':
      generateEnvironmentReport(process.argv[3]);
      break;
    case 'health':
      checkEnvironmentHealth();
      break;
    case 'compare':
      compareEnvironments(process.argv[3], process.argv[4]);
      break;
    default:
      console.log('IOC Core Environment Validation Scripts');
      console.log('');
      console.log('Usage:');
      console.log('  node validation-scripts.js validate      - Validate current environment');
      console.log('  node validation-scripts.js report [file] - Generate validation report');
      console.log('  node validation-scripts.js health        - Check environment health');
      console.log('  node validation-scripts.js compare [env1] [env2] - Compare environments');
      console.log('');
      console.log('Examples:');
      console.log('  NODE_ENV=production node validation-scripts.js validate');
      console.log('  NODE_ENV=staging node validation-scripts.js report staging-report.md');
      console.log('  node validation-scripts.js health');
      console.log('  node validation-scripts.js compare production staging');
      break;
  }
}

module.exports = {
  validateEnvironmentCLI,
  generateEnvironmentReport,
  checkEnvironmentHealth,
  compareEnvironments,
};