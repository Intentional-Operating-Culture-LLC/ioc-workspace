/**
 * Organization factory for test data generation
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestOrganization {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

let orgCounter = 0;

export function createTestOrganization(overrides?: Partial<TestOrganization>): TestOrganization {
  orgCounter++;
  const now = new Date().toISOString();
  
  return {
    id: uuidv4(),
    name: `Test Organization ${orgCounter}`,
    domain: `org${orgCounter}.test.com`,
    plan: 'starter',
    status: 'active',
    created_at: now,
    updated_at: now,
    settings: {
      features: {
        assessments: true,
        analytics: true,
        integrations: false,
      },
    },
    ...overrides,
  };
}

export function createTestOrganizations(
  count: number,
  overrides?: Partial<TestOrganization>
): TestOrganization[] {
  return Array.from({ length: count }, () => createTestOrganization(overrides));
}