// Wrapper to handle SSR issues with Supabase
export function createClient(cookieStore?: any) {
  // Return a mock during build time
  if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            limit: async () => ({ data: [], error: null }),
          }),
          limit: async () => ({ data: [], error: null }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({ data: null, error: null }),
        }),
      }),
    };
  }

  // Use dynamic import for the actual implementation
  const { createClient: createSupabaseServerClient } = require('./server');
  return createSupabaseServerClient(cookieStore);
}

export async function createAppDirectoryClient() {
  // Return a mock during build time
  if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return createClient();
  }

  // Use dynamic import for the actual implementation
  const { createAppDirectoryClient: createSupabaseAppClient } = require('./server');
  return createSupabaseAppClient();
}

export function createServiceRoleClient() {
  // Return a mock during build time
  if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return createClient();
  }

  // Use dynamic import for the actual implementation
  const { createServiceRoleClient: createSupabaseServiceClient } = require('./server');
  return createSupabaseServiceClient();
}