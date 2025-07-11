/**
 * IOC Core to Nx Migration Configuration
 * Defines mappings and transformations for the migration process
 */

const path = require('path');

module.exports = {
  // Source and target paths
  paths: {
    source: '/home/darren/ioc-core',
    target: '/home/darren/ioc-workspace',
  },

  // Directory mappings
  mappings: {
    apps: {
      'apps/admin': 'apps/admin-dashboard',
      'apps/production': 'apps/main-application',
      'apps/beta': 'apps/beta-application',
      'apps/dev': 'apps/dev-sandbox',
    },
    packages: {
      'packages/ui': 'libs/shared/ui',
      'packages/lib': 'libs/shared/data-access',
      'packages/types': 'libs/shared/types',
      'packages/config': 'libs/shared/config',
      'packages/api-utils': 'libs/shared/api-utils',
      'packages/test-utils': 'libs/testing/test-utils',
      'packages/lambda-analytics': 'libs/features/lambda-analytics',
    },
  },

  // Import path transformations
  importMappings: {
    // Package imports
    '@ioc/ui': '@ioc/shared/ui',
    '@ioc/lib': '@ioc/shared/data-access',
    '@ioc/types': '@ioc/shared/types',
    '@ioc/config': '@ioc/shared/config',
    '@ioc/api-utils': '@ioc/shared/api-utils',
    '@ioc/test-utils': '@ioc/testing/test-utils',
    '@ioc/lambda-analytics': '@ioc/features/lambda-analytics',
    
    // App imports
    '@ioc/admin': '@ioc/admin-dashboard',
    '@ioc/production': '@ioc/main-application',
    '@ioc/beta': '@ioc/beta-application',
    '@ioc/dev': '@ioc/dev-sandbox',
  },

  // File patterns to include/exclude
  patterns: {
    include: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.json',
      '**/*.md',
      '**/*.css',
      '**/*.scss',
      '**/*.sql',
      '**/*.yml',
      '**/*.yaml',
      '**/.*rc',
      '**/.*ignore',
    ],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.log',
      '**/.DS_Store',
      '**/tmp/**',
      '**/temp/**',
    ],
  },

  // Nx-specific configurations
  nx: {
    // Library tags for dependency constraints
    tags: {
      'libs/shared/ui': ['scope:shared', 'type:ui'],
      'libs/shared/data-access': ['scope:shared', 'type:data-access'],
      'libs/shared/types': ['scope:shared', 'type:types'],
      'libs/shared/config': ['scope:shared', 'type:config'],
      'libs/shared/api-utils': ['scope:shared', 'type:utils'],
      'libs/testing/test-utils': ['scope:testing', 'type:utils'],
      'libs/features/lambda-analytics': ['scope:features', 'type:feature'],
    },
    
    // Build configurations
    buildConfigurations: {
      production: {
        optimization: true,
        sourceMap: false,
        extractCss: true,
      },
      development: {
        optimization: false,
        sourceMap: true,
        extractCss: false,
      },
    },
  },

  // Migration options
  options: {
    preserveGitHistory: true,
    validateImports: true,
    generateReports: true,
    backupBeforeMigration: true,
    dryRun: false,
  },
};