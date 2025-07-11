/**
 * Database test helpers for IOC Core
 */

import { createClient } from '@supabase/supabase-js';

export interface TestDatabase {
  client: ReturnType<typeof createClient>;
  cleanup: () => Promise<void>;
}

/**
 * Create a test database client with cleanup
 */
export function createTestDatabase(): TestDatabase {
  const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
  
  const client = createClient(supabaseUrl, supabaseKey);

  const cleanup = async () => {
    // Clean up test data
    const tables = ['assessments', 'users', 'organizations', 'analytics'];
    
    for (const table of tables) {
      await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
  };

  return { client, cleanup };
}

/**
 * Seed test data
 */
export async function seedTestData(client: ReturnType<typeof createClient>) {
  // Create test organization
  const { data: org } = await client
    .from('organizations')
    .insert({
      name: 'Test Organization',
      domain: 'test.com',
    })
    .select()
    .single();

  if (!org) {
    throw new Error('Failed to create test organization');
  }

  // Create test users
  const { data: users } = await client
    .from('users')
    .insert([
      {
        email: 'admin@test.com',
        role: 'admin',
        organization_id: org.id,
      },
      {
        email: 'user@test.com',
        role: 'user',
        organization_id: org.id,
      },
    ])
    .select();

  return { organization: org, users };
}

/**
 * Create a test user with authentication
 */
export async function createAuthenticatedUser(
  client: ReturnType<typeof createClient>,
  userData = {
    email: 'test@example.com',
    password: 'password123',
  }
) {
  const { data: authData, error: authError } = await client.auth.signUp(userData);
  
  if (authError) throw authError;

  const { data: user, error: userError } = await client
    .from('users')
    .insert({
      id: authData.user?.id,
      email: userData.email,
      role: 'user',
    })
    .select()
    .single();

  if (userError) throw userError;

  return { authData, user };
}