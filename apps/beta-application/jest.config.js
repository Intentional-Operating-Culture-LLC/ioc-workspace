/**
 * Jest configuration for Beta app
 */

const config = {
  displayName: 'beta-application',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle @ioc/* imports
    '^@ioc/shared/ui(.*)$': '<rootDir>/../../libs/shared/ui/src$1',
    '^@ioc/shared/data-access(.*)$': '<rootDir>/../../libs/shared/data-access/src$1',
    '^@ioc/shared/types(.*)$': '<rootDir>/../../libs/shared/types/src$1',
    '^@ioc/shared/config(.*)$': '<rootDir>/../../libs/shared/config/src$1',
    '^@ioc/shared/api-utils(.*)$': '<rootDir>/../../libs/shared/api-utils/src$1',
    '^@ioc/testing/test-utils(.*)$': '<rootDir>/../../libs/testing/test-utils/src$1',
    '^@ioc/features/lambda-analytics(.*)$': '<rootDir>/../../libs/features/lambda-analytics/src$1',
    '^@ioc/assessment/scoring(.*)$': '<rootDir>/../../libs/assessment/scoring/src$1',
    '^@ioc/assessment/ocean-analytics(.*)$': '<rootDir>/../../libs/assessment/ocean-analytics/src$1',
    // Handle internal imports
    '^@/(.*)$': '<rootDir>/$1',
    // Handle CSS modules and static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: '../../coverage/apps/beta-application',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/?(*.)(spec|test).(ts|tsx|js|jsx)',
    '<rootDir>/tests/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/specs/**/*.(ts|tsx|js|jsx)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
};

module.exports = config;