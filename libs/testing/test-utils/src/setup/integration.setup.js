/**
 * Integration test specific setup
 */

// Set integration test environment
process.env.TEST_TYPE = 'integration';

// Use test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ioc_test';
process.env.SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Database cleanup utility
global.cleanupDatabase = async () => {
  // This would be implemented based on your database setup
  console.log('Cleaning up test database...');
};

// Run cleanup before each test suite
beforeAll(async () => {
  await global.cleanupDatabase();
});

// Run cleanup after all tests
afterAll(async () => {
  await global.cleanupDatabase();
});