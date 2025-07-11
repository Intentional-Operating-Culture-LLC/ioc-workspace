export default {
  displayName: 'shared-types',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle @ioc/* imports
    '^@ioc/shared/ui(.*)$': '<rootDir>/../ui/src$1',
    '^@ioc/shared/data-access(.*)$': '<rootDir>/../data-access/src$1',
    '^@ioc/shared/config(.*)$': '<rootDir>/../config/src$1',
    '^@ioc/shared/api-utils(.*)$': '<rootDir>/../api-utils/src$1',
    '^@ioc/testing/test-utils(.*)$': '<rootDir>/../../testing/test-utils/src$1',
    '^@ioc/features/lambda-analytics(.*)$': '<rootDir>/../../features/lambda-analytics/src$1',
    '^@ioc/assessment/scoring(.*)$': '<rootDir>/../../assessment/scoring/src$1',
    '^@ioc/assessment/ocean-analytics(.*)$': '<rootDir>/../../assessment/ocean-analytics/src$1',
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' } as Record<string, unknown>],
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'json', 'node'],
  coverageDirectory: '../../../coverage/libs/shared/types',
};
