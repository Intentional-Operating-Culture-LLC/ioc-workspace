// Supabase client exports
// Export server clients for API routes with build-safe implementation
export { createClient as createServerClient, createAppDirectoryClient, createServiceRoleClient } from './server-safe';

// Export browser client for UI components
export { createClient as createBrowserClient, createBrowserSupabaseClient, supabase } from './client';

// Note: Browser client is exported from ./client directly
// Use '@ioc/lib/supabase/client' import for UI components