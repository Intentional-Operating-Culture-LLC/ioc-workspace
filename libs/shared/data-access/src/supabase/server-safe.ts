// Safe server implementation that doesn't import @supabase/ssr during build

export function createClient(cookieStore?: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables');
    // Return a mock client for build time
    return createMockClient();
  }

  // Only import SSR module at runtime
  try {
    const { createServerClient } = require('@supabase/ssr');
    
    const cookies = cookieStore || {
      getAll: () => [],
      setAll: () => {}
    };

    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return typeof cookies.getAll === 'function' ? cookies.getAll() : [];
        },
        setAll(cookiesToSet: any[]) {
          try {
            if (typeof cookies.setAll === 'function') {
              cookies.setAll(cookiesToSet);
            } else if (typeof cookies.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }: any) =>
                cookies.set(name, value, options)
              );
            }
          } catch {
            // Ignore errors
          }
        },
      },
    });
  } catch (error) {
    console.warn('Failed to create Supabase client:', error);
    return createMockClient();
  }
}

export async function createAppDirectoryClient() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return createClient(cookieStore);
  } catch (error) {
    return createClient();
  }
}

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase service role environment variables');
    return createMockClient();
  }

  try {
    const { createServerClient } = require('@supabase/ssr');
    
    return createServerClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op
        },
      },
    });
  } catch (error) {
    console.warn('Failed to create service role client:', error);
    return createMockClient();
  }
}

// Mock client for build time
function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Mock client') }),
      getSession: async () => ({ data: { session: null }, error: new Error('Mock client') }),
      signIn: async () => ({ data: null, error: new Error('Mock client') }),
      signOut: async () => ({ error: new Error('Mock client') }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: new Error('Mock client') }),
          limit: async () => ({ data: [], error: new Error('Mock client') }),
        }),
        order: () => ({
          limit: async () => ({ data: [], error: new Error('Mock client') }),
        }),
        limit: async () => ({ data: [], error: new Error('Mock client') }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: new Error('Mock client') }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: null, error: new Error('Mock client') }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => async () => ({ data: null, error: new Error('Mock client') }),
      }),
    }),
  };
}