import { NextRequest, NextResponse } from 'next/server';
import { ApiError, RateLimitError } from './errors';
import { errorResponse } from './responses';
import { AuthUtils, TokenPayload } from './auth';

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
  request: NextRequest,
  context?: Record<string, unknown>
) => Promise<NextResponse | void>;

/**
 * CORS configuration
 */
export interface CorsConfig {
  origin: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * CORS middleware
 */
export function cors(config: CorsConfig): MiddlewareFunction {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin') || '';
    const response = NextResponse.next();

    // Check if origin is allowed
    let isAllowed = false;
    if (typeof config.origin === 'string') {
      isAllowed = config.origin === '*' || config.origin === origin;
    } else if (Array.isArray(config.origin)) {
      isAllowed = config.origin.includes(origin);
    } else if (typeof config.origin === 'function') {
      isAllowed = config.origin(origin);
    }

    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      
      if (config.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (config.methods) {
        response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
      }

      if (config.allowedHeaders) {
        response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }

      if (config.exposedHeaders) {
        response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
      }

      if (config.maxAge) {
        response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
      }
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (request: NextRequest) => string;
  skip?: (request: NextRequest) => boolean;
}

/**
 * Simple in-memory rate limiter (use Redis in production)
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private config: RateLimitConfig) {}

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (record.count >= this.config.max) {
      return false;
    }

    record.count++;
    return true;
  }

  getRetryAfter(key: string): number | undefined {
    const record = this.requests.get(key);
    if (!record) return undefined;

    const now = Date.now();
    return Math.max(0, Math.ceil((record.resetTime - now) / 1000));
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig): MiddlewareFunction {
  const limiter = new RateLimiter(config);
  
  return async (request: NextRequest) => {
    if (config.skip?.(request)) {
      return;
    }

    const key = config.keyGenerator?.(request) || request.ip || 'anonymous';
    const allowed = await limiter.isAllowed(key);

    if (!allowed) {
      const retryAfter = limiter.getRetryAfter(key);
      throw new RateLimitError(retryAfter);
    }
  };
}

/**
 * Authentication middleware
 */
export interface AuthMiddlewareConfig {
  optional?: boolean;
  roles?: string[];
  permissions?: string[];
}

export function auth(config: AuthMiddlewareConfig = {}): MiddlewareFunction {
  return async (request: NextRequest, context) => {
    try {
      const user = await AuthUtils.getAuthUser(request);
      
      // Check roles
      if (config.roles && !config.roles.some(role => AuthUtils.hasRole(user, role))) {
        throw new ApiError('Insufficient role', 403, 'FORBIDDEN');
      }

      // Check permissions
      if (config.permissions && !config.permissions.some(perm => AuthUtils.hasPermission(user, perm))) {
        throw new ApiError('Insufficient permissions', 403, 'FORBIDDEN');
      }

      // Add user to context
      if (context) {
        context.user = user;
      }
    } catch (error) {
      if (!config.optional) {
        throw error;
      }
    }
  };
}

/**
 * Logging middleware
 */
export interface LogConfig {
  skip?: (request: NextRequest) => boolean;
  logBody?: boolean;
  logHeaders?: boolean;
}

export function logging(config: LogConfig = {}): MiddlewareFunction {
  return async (request: NextRequest) => {
    if (config.skip?.(request)) {
      return;
    }

    const start = Date.now();
    const { method, url } = request;

    console.log(`[${new Date().toISOString()}] ${method} ${url}`);

    if (config.logHeaders) {
      console.log('Headers:', Object.fromEntries(request.headers));
    }

    if (config.logBody && request.body) {
      try {
        const body = await request.json();
        console.log('Body:', body);
      } catch {
        // Body might not be JSON
      }
    }

    // Log response time after request completes
    process.nextTick(() => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${duration}ms`);
    });
  };
}

/**
 * Request ID middleware
 */
export function requestId(): MiddlewareFunction {
  return async (request: NextRequest, context) => {
    const requestId = request.headers.get('x-request-id') || 
      crypto.randomUUID();
    
    if (context) {
      context.requestId = requestId;
    }

    const response = NextResponse.next();
    response.headers.set('x-request-id', requestId);
    return response;
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(): MiddlewareFunction {
  return async () => {
    const response = NextResponse.next();
    
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );
    
    return response;
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async (request: NextRequest, context) => {
    for (const middleware of middlewares) {
      const response = await middleware(request, context);
      if (response) {
        return response;
      }
    }
  };
}

/**
 * Error handling wrapper
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>
): (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse> {
  return async (request: NextRequest, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error, { requestId: context?.requestId as string });
      }
      
      console.error('Unhandled error:', error);
      return errorResponse(
        new Error('Internal server error'),
        { requestId: context?.requestId as string }
      );
    }
  };
}