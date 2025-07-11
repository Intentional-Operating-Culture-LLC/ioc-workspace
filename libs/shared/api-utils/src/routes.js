import { NextResponse } from 'next/server';
import { handleAPIError, ErrorResponses } from './errors.js';

/**
 * Create a protected route handler with auth validation
 */
export function createProtectedRoute(handler) {
  return async function protectedRouteHandler(request, context) {
    try {
      // Import createServiceRoleClient dynamically to avoid circular dependency
      const { createServiceRoleClient } = await import('@ioc/lib');
      const supabase = createServiceRoleClient();
      
      // Get auth token
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return ErrorResponses.unauthorized('Missing authentication token');
      }

      // Get user from token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return ErrorResponses.unauthorized('Invalid authentication token');
      }

      // Create enhanced context with auth info
      const enhancedContext = {
        ...context,
        user,
        supabase,
        userId: user.id,
      };

      // Call the actual handler
      return await handler(request, enhancedContext);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Create an organization-scoped route handler
 */
export function createOrganizationRoute(handler, requiredRoles = null) {
  return createProtectedRoute(async (request, context) => {
    // Get organization ID from query params or body
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('organization_id') || searchParams.get('organizationId');
    
    // If not in query, check body for POST/PUT requests
    if (!organizationId && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.clone().json();
        organizationId = body.organization_id || body.organizationId;
      } catch (e) {
        // Body parsing failed, continue without it
      }
    }

    if (!organizationId) {
      return ErrorResponses.badRequest('Organization ID is required');
    }

    // Validate organization access
    const { data: membership } = await context.supabase
      .from('user_organizations')
      .select('role, permissions')
      .eq('user_id', context.userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return ErrorResponses.forbidden('Access denied to organization');
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    // Add organization context
    const enhancedContext = {
      ...context,
      organizationId,
      membership,
      userRole: membership.role,
    };

    return handler(request, enhancedContext);
  });
}

/**
 * Create a public route handler with error handling
 */
export function createPublicRoute(handler) {
  return async function publicRouteHandler(request, context) {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Rate limiting middleware
 */
const rateLimitMap = new Map();

export function withRateLimit(handler, options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 60, // 60 requests per window
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'anonymous',
  } = options;

  return async function rateLimitedHandler(request, context) {
    const key = keyGenerator(request);
    const now = Date.now();
    
    // Clean up old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k);
      }
    }
    
    // Get or create rate limit entry
    let limit = rateLimitMap.get(key);
    if (!limit || limit.resetTime < now) {
      limit = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitMap.set(key, limit);
    }
    
    // Check rate limit
    if (limit.count >= max) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(limit.resetTime).toISOString(),
          }
        }
      );
    }
    
    // Increment count
    limit.count++;
    
    // Add rate limit headers to response
    const response = await handler(request, context);
    response.headers.set('X-RateLimit-Limit', max.toString());
    response.headers.set('X-RateLimit-Remaining', (max - limit.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());
    
    return response;
  };
}

/**
 * CORS middleware
 */
export function withCORS(handler, options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = true,
  } = options;

  return async function corsHandler(request, context) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          'Access-Control-Allow-Credentials': credentials.toString(),
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle actual request
    const response = await handler(request, context);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', credentials.toString());
    
    return response;
  };
}

/**
 * Helper to validate organization access - for use within route handlers
 */
export async function validateOrganizationAccess(supabase, userId, organizationId, requiredRoles = null) {
  const { data: membership, error } = await supabase
    .from('user_organizations')
    .select('role, permissions')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();

  if (error || !membership) {
    return { error: ErrorResponses.forbidden('Access denied to organization') };
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    return { error: ErrorResponses.forbidden('Insufficient permissions') };
  }

  return { membership };
}