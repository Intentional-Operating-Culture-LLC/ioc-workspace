const nxPreset = require('@nx/jest/preset').default;

module.exports = { 
  ...nxPreset,
  // Global setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Module name mapping for @ioc/* imports
  moduleNameMapper: {
    '^@ioc/shared/ui(.*)$': '<rootDir>/libs/shared/ui/src$1',
    '^@ioc/shared/data-access(.*)$': '<rootDir>/libs/shared/data-access/src$1',
    '^@ioc/shared/types(.*)$': '<rootDir>/libs/shared/types/src$1',
    '^@ioc/shared/config(.*)$': '<rootDir>/libs/shared/config/src$1',
    '^@ioc/shared/api-utils(.*)$': '<rootDir>/libs/shared/api-utils/src$1',
    '^@ioc/testing/test-utils(.*)$': '<rootDir>/libs/testing/test-utils/src$1',
    '^@ioc/features/lambda-analytics(.*)$': '<rootDir>/libs/features/lambda-analytics/src$1',
    '^@ioc/assessment/scoring(.*)$': '<rootDir>/libs/assessment/scoring/src$1',
    '^@ioc/assessment/ocean-analytics(.*)$': '<rootDir>/libs/assessment/ocean-analytics/src$1',
    // Handle CSS modules and static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },
  // TypeScript handling
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // Test environment
  testEnvironment: 'node',
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.spec.{ts,tsx,js,jsx}',
  ],
};
