/**
 * Integration Test Setup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test database client
global.testSupabase = createClient(
  process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
  process.env.TEST_SUPABASE_SERVICE_KEY || 'test-service-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Test data generators
global.generateTestUser = async () => {
  const timestamp = Date.now();
  const email = `test-${timestamp}@example.com`;
  
  const { data: authData, error: authError } = await global.testSupabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });
  
  if (authError) throw authError;
  
  const { data: userData, error: userError } = await global.testSupabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name: `Test User ${timestamp}`,
      role: 'user',
    })
    .select()
    .single();
  
  if (userError) throw userError;
  
  return {
    ...userData,
    password: 'TestPassword123!',
  };
};

global.generateTestAssessment = async (userId, type = 'ocean_basic') => {
  const { data, error } = await global.testSupabase
    .from('assessments')
    .insert({
      user_id: userId,
      type,
      status: 'in_progress',
      metadata: {
        test: true,
        created_at: new Date().toISOString(),
      },
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Cleanup utilities
global.cleanupTestUser = async (userId) => {
  // Delete in correct order to respect foreign keys
  await global.testSupabase.from('assessment_scores').delete().eq('user_id', userId);
  await global.testSupabase.from('assessment_responses').delete().eq('user_id', userId);
  await global.testSupabase.from('assessments').delete().eq('user_id', userId);
  await global.testSupabase.from('users').delete().eq('id', userId);
  await global.testSupabase.auth.admin.deleteUser(userId);
};

global.cleanupTestAssessment = async (assessmentId) => {
  await global.testSupabase.from('assessment_scores').delete().eq('assessment_id', assessmentId);
  await global.testSupabase.from('assessment_responses').delete().eq('assessment_id', assessmentId);
  await global.testSupabase.from('assessments').delete().eq('id', assessmentId);
};

// Mock external services
jest.mock('@/lib/zoho', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  createLead: jest.fn().mockResolvedValue({ id: 'mock-lead-id' }),
  updateContact: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
}));

// Setup test transaction rollback
beforeEach(async () => {
  // Start a new transaction for each test
  await global.testSupabase.rpc('begin_test_transaction');
});

afterEach(async () => {
  // Rollback transaction after each test
  await global.testSupabase.rpc('rollback_test_transaction');
});