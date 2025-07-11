/**
 * @fileoverview Security configuration for all environments
 * @description Comprehensive security settings including CSP, headers, and policies
 */

const { getEnvironmentConfig } = require('./env-schema');

/**
 * Content Security Policy configuration by environment
 */
const getContentSecurityPolicy = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'child-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-src': ["'none'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'"],
  };
  
  // Environment-specific CSP configurations
  if (environment === 'production') {
    return {
      ...baseDirectives,
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Next.js
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        'https://js.stripe.com',
        'https://cdn.jsdelivr.net',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        '*.supabase.co',
        'https://cdn.example.com',
      ],
      'font-src': [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
      ],
      'connect-src': [
        "'self'",
        'https://api.stripe.com',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        '*.supabase.co',
        'wss://*.supabase.co',
        'https://api.openai.com',
        'https://api.anthropic.com',
      ],
      'frame-src': [
        'https://js.stripe.com',
        'https://hooks.stripe.com',
      ],
      'child-src': [
        'https://js.stripe.com',
      ],
    };
  } else if (environment === 'staging') {
    return {
      ...baseDirectives,
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // More permissive for staging
        'https://www.google-analytics.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:',
        '*.supabase.co',
        'https://beta-cdn.example.com',
      ],
      'font-src': [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
      ],
      'connect-src': [
        "'self'",
        'https:',
        'wss:',
        'ws:',
        '*.supabase.co',
        'wss://*.supabase.co',
        'https://api.openai.com',
        'https://api.anthropic.com',
      ],
      'frame-src': [
        "'self'",
        'https:',
      ],
    };
  } else {
    // Development - most permissive
    return {
      ...baseDirectives,
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https:',
        'http:',
        'ws:',
        'wss:',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https:',
        'http:',
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'http:',
        '*.supabase.co',
      ],
      'font-src': [
        "'self'",
        'data:',
        'https:',
        'http:',
      ],
      'connect-src': [
        "'self'",
        'https:',
        'http:',
        'ws:',
        'wss:',
        '*.supabase.co',
        'wss://*.supabase.co',
      ],
      'frame-src': [
        "'self'",
        'https:',
        'http:',
      ],
      'child-src': [
        "'self'",
        'https:',
        'http:',
      ],
    };
  }
};

/**
 * Security headers configuration by environment
 */
const getSecurityHeaders = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseHeaders = [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=self',
    },
  ];
  
  // Environment-specific headers
  if (environment === 'production') {
    baseHeaders.push(
      {
        key: 'X-Frame-Options',
        value: envConfig.securityConfig?.xFrameOptions || 'DENY',
      },
      {
        key: 'Strict-Transport-Security',
        value: envConfig.securityConfig?.hstsEnabled 
          ? 'max-age=31536000; includeSubDomains; preload'
          : 'max-age=0',
      },
      {
        key: 'X-Robots-Tag',
        value: 'index, follow',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-site',
      }
    );
  } else if (environment === 'staging') {
    baseHeaders.push(
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin-allow-popups',
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'unsafe-none',
      }
    );
  } else {
    // Development headers
    baseHeaders.push(
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'unsafe-none',
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'unsafe-none',
      }
    );
  }
  
  // Add CSP header if enabled
  if (envConfig.securityConfig?.cspEnabled) {
    const cspDirectives = getContentSecurityPolicy(environment);
    const cspString = Object.entries(cspDirectives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    
    baseHeaders.push({
      key: 'Content-Security-Policy',
      value: cspString,
    });
  }
  
  return baseHeaders;
};

/**
 * Rate limiting configuration
 */
const getRateLimitConfig = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseConfig = {
    windowMs: envConfig.rateLimitConfig?.windowMs || 60000, // 1 minute
    max: envConfig.rateLimitConfig?.max || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  };
  
  // Environment-specific rate limiting
  if (environment === 'production') {
    return {
      ...baseConfig,
      max: 50, // Stricter in production
      windowMs: 60000, // 1 minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      max: 200, // More lenient for testing
      windowMs: 60000,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
    };
  } else {
    // Development - very lenient
    return {
      ...baseConfig,
      max: 1000,
      windowMs: 60000,
      skipSuccessfulRequests: true,
      skipFailedRequests: true,
    };
  }
};

/**
 * Cookie and session configuration
 */
const getCookieConfig = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseConfig = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
  
  // Environment-specific cookie settings
  if (environment === 'production') {
    return {
      ...baseConfig,
      secure: true, // HTTPS only in production
      sameSite: 'strict',
      domain: '.example.com',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in production
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      secure: true,
      sameSite: 'lax',
      domain: '.beta.example.com',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
  } else {
    // Development
    return {
      ...baseConfig,
      secure: false, // HTTP allowed in development
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour in development
    };
  }
};

/**
 * Session configuration
 */
const getSessionConfig = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseConfig = {
    secret: envConfig.NEXTAUTH_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'ioc.session',
  };
  
  // Environment-specific session settings
  if (environment === 'production') {
    return {
      ...baseConfig,
      cookie: {
        ...getCookieConfig(environment),
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      store: 'redis', // Use Redis in production
      proxy: true,
      trustProxy: true,
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      cookie: {
        ...getCookieConfig(environment),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      store: 'redis',
      proxy: true,
    };
  } else {
    // Development
    return {
      ...baseConfig,
      cookie: {
        ...getCookieConfig(environment),
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
      },
      store: 'memory',
      proxy: false,
    };
  }
};

/**
 * CORS configuration
 */
const getCorsConfig = (environment = 'development') => {
  const baseConfig = {
    credentials: true,
    optionsSuccessStatus: 200,
  };
  
  // Environment-specific CORS settings
  if (environment === 'production') {
    return {
      ...baseConfig,
      origin: [
        'https://ioc-core.example.com',
        'https://www.ioc-core.example.com',
        'https://cdn.example.com',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      origin: [
        'https://beta.ioc-core.example.com',
        'https://staging.ioc-core.example.com',
        'https://beta-cdn.example.com',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Debug-Mode',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining', 'X-Debug-Info'],
    };
  } else {
    // Development - most permissive
    return {
      ...baseConfig,
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
      allowedHeaders: ['*'],
      exposedHeaders: ['*'],
    };
  }
};

/**
 * Security middleware configuration
 */
const getSecurityMiddleware = (environment = 'development') => {
  return {
    headers: getSecurityHeaders(environment),
    rateLimit: getRateLimitConfig(environment),
    cors: getCorsConfig(environment),
    session: getSessionConfig(environment),
    cookie: getCookieConfig(environment),
    csp: getContentSecurityPolicy(environment),
  };
};

/**
 * Validation function for security configuration
 */
const validateSecurityConfig = (environment = 'development') => {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  const envConfig = getEnvironmentConfig();
  
  // Check required security settings
  if (!envConfig.NEXTAUTH_SECRET) {
    results.errors.push('NEXTAUTH_SECRET is required');
    results.valid = false;
  }
  
  if (environment === 'production') {
    // Production-specific validations
    if (!envConfig.securityConfig?.cspEnabled) {
      results.warnings.push('CSP should be enabled in production');
    }
    
    if (!envConfig.securityConfig?.hstsEnabled) {
      results.warnings.push('HSTS should be enabled in production');
    }
    
    if (!envConfig.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      results.errors.push('HTTPS is required in production');
      results.valid = false;
    }
    
    if (envConfig.NEXTAUTH_SECRET.length < 64) {
      results.errors.push('NEXTAUTH_SECRET should be at least 64 characters in production');
      results.valid = false;
    }
  }
  
  return results;
};

module.exports = {
  getContentSecurityPolicy,
  getSecurityHeaders,
  getRateLimitConfig,
  getCookieConfig,
  getSessionConfig,
  getCorsConfig,
  getSecurityMiddleware,
  validateSecurityConfig,
};