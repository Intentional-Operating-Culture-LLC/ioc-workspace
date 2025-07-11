/**
 * User factory for test data generation
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  id: string;
  email: string;
  password?: string;
  role: 'admin' | 'user' | 'viewer';
  organization_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

let userCounter = 0;

export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  userCounter++;
  const now = new Date().toISOString();
  
  return {
    id: uuidv4(),
    email: `user${userCounter}@test.com`,
    password: 'Test123!@#',
    role: 'user',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createTestAdmin(overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    role: 'admin',
    email: `admin${userCounter}@test.com`,
    ...overrides,
  });
}

export function createTestUsers(count: number, overrides?: Partial<TestUser>): TestUser[] {
  return Array.from({ length: count }, () => createTestUser(overrides));
}