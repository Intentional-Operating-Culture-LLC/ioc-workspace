/**
 * Jest configuration for unit tests
 */

const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: [
    '**/tests/unit/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/__tests__/unit/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/../../packages/test-utils/src/setup/unit.setup.js',
  ],
  // Unit tests should be fast
  testTimeout: 5000,
};