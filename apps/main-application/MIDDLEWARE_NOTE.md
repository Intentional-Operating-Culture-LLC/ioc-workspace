# Middleware Note

The middleware.js file has been temporarily removed due to a build issue with @supabase/ssr causing "self is not defined" errors during the Next.js build process.

## Issue
The @supabase/ssr module tries to access browser globals (`self`) during the build process, which causes the build to fail.

## Temporary Solution
The middleware has been removed to allow the build to succeed. Authentication checks are still performed in individual pages and API routes.

## Permanent Fix Options
1. Update to a newer version of @supabase/ssr that fixes the SSR build issue
2. Use a custom middleware implementation that doesn't rely on @supabase/ssr
3. Implement authentication checks using Next.js API routes instead of middleware

## To Restore Middleware
Once the @supabase/ssr issue is resolved, you can restore the middleware functionality by creating a new middleware.js file with proper SSR-safe imports.