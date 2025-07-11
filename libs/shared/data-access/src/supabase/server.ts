// Use eval to prevent bundler from analyzing the import
const getSupabaseSSR = () => {
  const _require = eval('require');
  return _require('@supabase/ssr');
};

const { createServerClient: createSupabaseServerClient } = getSupabaseSSR();

// Function that works for pages directory (API routes)
export function createClient(cookieStore?: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // If no cookieStore provided, create a minimal implementation for pages directory
  const cookies = cookieStore || {
    getAll: () => [],
    setAll: () => {}
  };

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
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
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Function specifically for app directory (uses next/headers)
export async function createAppDirectoryClient() {
  try {
    // Dynamic import to avoid compilation errors in pages directory
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return createClient(cookieStore);
  } catch (error) {
    // Fallback for pages directory
    return createClient();
  }
}

// Create a service role client for admin operations
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role environment variables');
  }

  return createSupabaseServerClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for service role client
      },
    },
  });
}

// Legacy export for backwards compatibility with app route client
export const createAppRouteClient = createClient;