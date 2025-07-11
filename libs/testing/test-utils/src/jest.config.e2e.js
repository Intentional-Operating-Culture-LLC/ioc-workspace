/**
 * Jest configuration for end-to-end tests
 */

const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'e2e',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/e2e/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/__tests__/e2e/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/../../packages/test-utils/src/setup/e2e.setup.js',
  ],
  // E2E tests need more time
  testTimeout: 60000,
  // Run e2e tests serially
  maxWorkers: 1,
  // Don't transform node_modules for e2e tests
  transformIgnorePatterns: [],
};