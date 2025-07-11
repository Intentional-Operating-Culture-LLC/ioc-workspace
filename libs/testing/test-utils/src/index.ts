/**
 * @ioc/test-utils - Shared testing utilities for IOC Core applications
 */

// Export all mock utilities
export * from './mocks';

// Export all fixtures
export * from './fixtures';

// Export all helpers
export * from './helpers';

// Database helpers
export * from './database-helpers';

// API testing helpers
export * from './api-helpers';

// Component testing helpers
export * from './component-helpers';

// Performance testing helpers
export * from './performance-helpers';

// Test data factories
export * from './factories';

// Re-export commonly used items for convenience
export {
  // Mock factories
  createMockUser,
  createMockOrganization,
  createMockAssessment,
  createMockQuestion,
  createMockApiResponse,
  createMockErrorResponse,
  MockFetch,
  MockLocalStorage,
  createMockRouter,
  createMockSupabaseClient,
} from './mocks';

export {
  // Fixtures
  userFixtures,
  organizationFixtures,
  assessmentFixtures,
  apiResponseFixtures,
  formDataFixtures,
  dateFixtures,
} from './fixtures';

export {
  // Helpers
  waitFor,
  waitForAsync,
  renderWithProviders,
  createWrapper,
  ConsoleMock,
  generators,
  assertions,
  PerformanceTimer,
  MemoryLeakDetector,
  cleanSnapshot,
} from './helpers';