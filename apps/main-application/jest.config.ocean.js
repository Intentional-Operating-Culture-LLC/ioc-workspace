/**
 * Jest configuration for OCEAN Assessment testing
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/unit.setup.js',
      ],
      coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/.next/',
      ],
    },
    {
      ...baseConfig,
      displayName: 'integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/integration.setup.js',
      ],
      testEnvironment: 'node',
      globalSetup: '<rootDir>/tests/setup/database.setup.js',
      globalTeardown: '<rootDir>/tests/setup/database.teardown.js',
    },
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/tests/**',
    '!**/coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './app/api/assessments/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './lib/assessment/**': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
    }],
    ['jest-html-reporter', {
      pageTitle: 'OCEAN Assessment Test Report',
      outputPath: 'test-results/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true,
    }],
  ],
};