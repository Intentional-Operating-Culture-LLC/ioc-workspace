/**
 * Jest configuration for integration tests
 */

const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: [
    '**/tests/integration/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/__tests__/integration/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/../../packages/test-utils/src/setup/integration.setup.js',
  ],
  // Integration tests need more time
  testTimeout: 30000,
  // Run integration tests serially
  maxWorkers: 1,
};