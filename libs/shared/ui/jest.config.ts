export default {
  displayName: 'shared-ui',
  preset: '../../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle @ioc/* imports
    '^@ioc/shared/data-access(.*)$': '<rootDir>/../data-access/src$1',
    '^@ioc/shared/types(.*)$': '<rootDir>/../types/src$1',
    '^@ioc/shared/config(.*)$': '<rootDir>/../config/src$1',
    '^@ioc/shared/api-utils(.*)$': '<rootDir>/../api-utils/src$1',
    '^@ioc/testing/test-utils(.*)$': '<rootDir>/../../testing/test-utils/src$1',
    '^@ioc/features/lambda-analytics(.*)$': '<rootDir>/../../features/lambda-analytics/src$1',
    '^@ioc/assessment/scoring(.*)$': '<rootDir>/../../assessment/scoring/src$1',
    '^@ioc/assessment/ocean-analytics(.*)$': '<rootDir>/../../assessment/ocean-analytics/src$1',
    // Handle CSS modules and static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    } as Record<string, unknown>],
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['@nx/react/babel'] } as Record<string, unknown>],
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: '../../../coverage/libs/shared/ui',
};
