#!/usr/bin/env node

/**
 * @fileoverview Environment validation script
 * @description Validates environment configuration and generates reports
 */

const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');
const { EnvironmentValidator } = require('../env-validator-advanced');
const { createSecurityConfig } = require('../security-config-advanced');
const { createDatabaseConfig } = require('../database-config-advanced');
const { createFeatureFlagManager } = require('../feature-flags-advanced');

/**
 * Environment validation CLI
 */
class EnvironmentValidationCLI {
  constructor() {
    this.args = this.parseArgs();
    this.validator = new EnvironmentValidator();
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      environment: 'development',
      verbose: false,
      output: null,
      fix: false,
      strict: false,
    };

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--env':
        case '-e':
          options.environment = args[++i];
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--output':
        case '-o':
          options.output = args[++i];
          break;
        case '--fix':
        case '-f':
          options.fix = true;
          break;
        case '--strict':
        case '-s':
          options.strict = true;
          break;
        case '--help':
        case '-h':
          this.printHelp();
          process.exit(0);
      }
    }

    return options;
  }

  /**
   * Print help message
   */
  printHelp() {
    console.log(`
${chalk.blue('Environment Validation Tool')}

Usage: node validate-env.js [options]

Options:
  -e, --env <environment>    Environment to validate (default: development)
  -v, --verbose             Show detailed validation output
  -o, --output <file>       Save validation report to file
  -f, --fix                 Attempt to fix validation issues
  -s, --strict              Exit with error on warnings
  -h, --help                Show this help message

Examples:
  node validate-env.js --env production
  node validate-env.js --env staging --verbose --output report.json
  node validate-env.js --fix
`);
  }

  /**
   * Run validation
   */
  async run() {
    console.log(chalk.blue('\n🔍 IOC Core Environment Validation\n'));
    console.log(chalk.gray(`Environment: ${this.args.environment}`));
    console.log(chalk.gray(`Time: ${new Date().toISOString()}\n`));

    // Set NODE_ENV for validation
    process.env.NODE_ENV = this.args.environment;

    // Run validation
    const result = this.validator.validate();
    
    // Display results
    console.log(result.format());

    // Show detailed configuration if verbose
    if (this.args.verbose && result.success) {
      await this.showDetailedConfiguration();
    }

    // Generate report if requested
    if (this.args.output) {
      await this.generateReport(result);
    }

    // Fix issues if requested
    if (this.args.fix && !result.success) {
      await this.attemptFixes(result);
    }

    // Exit with appropriate code
    const exitCode = result.success ? 0 : 1;
    if (this.args.strict && result.warnings.length > 0) {
      process.exit(1);
    }
    process.exit(exitCode);
  }

  /**
   * Show detailed configuration
   */
  async showDetailedConfiguration() {
    console.log(chalk.blue('\n📊 Configuration Details:\n'));

    // Environment summary
    const summary = this.validator.getSummary();
    console.log(chalk.yellow('Environment Summary:'));
    console.log(JSON.stringify(summary, null, 2));

    // Security configuration
    console.log(chalk.yellow('\nSecurity Configuration:'));
    const securityConfig = createSecurityConfig(this.args.environment);
    console.log(JSON.stringify({
      headers: Object.keys(securityConfig.headers),
      rateLimit: securityConfig.rateLimit,
      cors: {
        origin: typeof securityConfig.cors.origin,
        credentials: securityConfig.cors.credentials,
      },
      session: {
        name: securityConfig.session.name,
        secure: securityConfig.session.cookie?.secure,
      },
    }, null, 2));

    // Database configuration
    console.log(chalk.yellow('\nDatabase Configuration:'));
    try {
      const dbConfig = createDatabaseConfig(this.args.environment);
      console.log(JSON.stringify({
        pool: {
          min: dbConfig.min,
          max: dbConfig.max,
        },
        ssl: !!dbConfig.ssl,
        monitoring: !!dbConfig.onConnect,
      }, null, 2));
    } catch (error) {
      console.log(chalk.red('Database configuration error:', error.message));
    }

    // Feature flags
    console.log(chalk.yellow('\nFeature Flags:'));
    const flagManager = createFeatureFlagManager(this.args.environment);
    const enabledFeatures = flagManager.getEnabledFeatures();
    console.log(JSON.stringify(enabledFeatures, null, 2));
  }

  /**
   * Generate validation report
   */
  async generateReport(result) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.args.environment,
      validation: {
        success: result.success,
        errors: result.errors,
        warnings: result.warnings,
      },
      summary: this.validator.getSummary(),
      configurations: {},
    };

    // Add configuration details
    try {
      report.configurations.security = createSecurityConfig(this.args.environment);
    } catch (error) {
      report.configurations.security = { error: error.message };
    }

    try {
      report.configurations.database = createDatabaseConfig(this.args.environment);
    } catch (error) {
      report.configurations.database = { error: error.message };
    }

    try {
      const flagManager = createFeatureFlagManager(this.args.environment);
      report.configurations.features = flagManager.getEnabledFeatures();
    } catch (error) {
      report.configurations.features = { error: error.message };
    }

    // Write report
    const outputPath = path.resolve(this.args.output);
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n✓ Report saved to: ${outputPath}`));
  }

  /**
   * Attempt to fix validation issues
   */
  async attemptFixes(result) {
    console.log(chalk.yellow('\n🔧 Attempting to fix validation issues...\n'));

    const fixes = [];
    
    // Check for missing required variables
    for (const error of result.errors) {
      if (error.includes('Required at')) {
        const match = error.match(/^([A-Z_]+):/);
        if (match) {
          const varName = match[1];
          fixes.push({
            variable: varName,
            action: 'add',
            suggestion: this.getSuggestionForVariable(varName),
          });
        }
      }
    }

    if (fixes.length === 0) {
      console.log(chalk.yellow('No automatic fixes available.'));
      return;
    }

    // Generate .env.example updates
    const envExample = [];
    for (const fix of fixes) {
      console.log(chalk.yellow(`• ${fix.variable}: ${fix.suggestion.description}`));
      envExample.push(`# ${fix.suggestion.description}`);
      envExample.push(`${fix.variable}=${fix.suggestion.example}`);
      envExample.push('');
    }

    // Save suggestions
    const suggestionsPath = `.env.${this.args.environment}.suggestions`;
    await fs.writeFile(suggestionsPath, envExample.join('\n'));
    console.log(chalk.green(`\n✓ Suggestions saved to: ${suggestionsPath}`));
    console.log(chalk.gray('Review and add these to your environment configuration.'));
  }

  /**
   * Get suggestion for missing variable
   */
  getSuggestionForVariable(varName) {
    const suggestions = {
      DATABASE_URL: {
        description: 'PostgreSQL database connection string',
        example: 'postgresql://user:password@localhost:5432/ioc_dev',
      },
      REDIS_URL: {
        description: 'Redis connection string',
        example: 'redis://localhost:6379',
      },
      NEXTAUTH_SECRET: {
        description: 'NextAuth secret key (generate with: openssl rand -base64 32)',
        example: 'your-secret-key-here',
      },
      NEXT_PUBLIC_APP_URL: {
        description: 'Public application URL',
        example: 'http://localhost:3000',
      },
      // Add more suggestions as needed
    };

    return suggestions[varName] || {
      description: `${varName} configuration value`,
      example: 'your-value-here',
    };
  }
}

// Run CLI
if (require.main === module) {
  const cli = new EnvironmentValidationCLI();
  cli.run().catch(error => {
    console.error(chalk.red('\n❌ Validation failed:'), error.message);
    process.exit(1);
  });
}

module.exports = EnvironmentValidationCLI;