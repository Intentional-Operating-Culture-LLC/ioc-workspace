export default {
  displayName: 'assessment-ocean-analytics',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle @ioc/* imports
    '^@ioc/shared/ui(.*)$': '<rootDir>/../../shared/ui/src$1',
    '^@ioc/shared/data-access(.*)$': '<rootDir>/../../shared/data-access/src$1',
    '^@ioc/shared/types(.*)$': '<rootDir>/../../shared/types/src$1',
    '^@ioc/shared/config(.*)$': '<rootDir>/../../shared/config/src$1',
    '^@ioc/shared/api-utils(.*)$': '<rootDir>/../../shared/api-utils/src$1',
    '^@ioc/testing/test-utils(.*)$': '<rootDir>/../../testing/test-utils/src$1',
    '^@ioc/features/lambda-analytics(.*)$': '<rootDir>/../../features/lambda-analytics/src$1',
    '^@ioc/assessment/scoring(.*)$': '<rootDir>/../scoring/src$1',
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' } as Record<string, unknown>],
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'json', 'node'],
  coverageDirectory: '../../../coverage/libs/assessment/ocean-analytics',
};
