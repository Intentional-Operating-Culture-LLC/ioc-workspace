/**
 * @fileoverview Advanced security configuration for different environments
 * @description Enterprise-grade security settings including CSP, headers, and policies
 */

/**
 * Content Security Policy builder
 */
class CSPBuilder {
  constructor(environment = 'development') {
    this.environment = environment;
    this.directives = this._getDefaultDirectives();
  }

  /**
   * Get default CSP directives for environment
   */
  _getDefaultDirectives() {
    const base = {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"],
    };

    // Environment-specific modifications
    switch (this.environment) {
      case 'production':
        return {
          ...base,
          'upgrade-insecure-requests': [],
          'block-all-mixed-content': [],
          'require-trusted-types-for': ["'script'"],
        };
      
      case 'staging':
      case 'beta':
        return {
          ...base,
          'script-src': [...base['script-src'], "'unsafe-inline'"], // Allow inline scripts for testing
          'style-src': [...base['style-src'], "'unsafe-inline'"],
          'report-uri': ['/api/csp-report'],
        };
      
      case 'development':
        return {
          ...base,
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*'],
          'style-src': ["'self'", "'unsafe-inline'", 'http://localhost:*'],
          'connect-src': ["'self'", 'ws://localhost:*', 'http://localhost:*'],
        };
      
      default:
        return base;
    }
  }

  /**
   * Add source to directive
   */
  addSource(directive, source) {
    if (!this.directives[directive]) {
      this.directives[directive] = [];
    }
    if (!this.directives[directive].includes(source)) {
      this.directives[directive].push(source);
    }
    return this;
  }

  /**
   * Add nonce support
   */
  addNonce(nonce) {
    this.addSource('script-src', `'nonce-${nonce}'`);
    this.addSource('style-src', `'nonce-${nonce}'`);
    return this;
  }

  /**
   * Add hash support
   */
  addHash(algorithm, hash) {
    const hashSource = `'${algorithm}-${hash}'`;
    this.addSource('script-src', hashSource);
    this.addSource('style-src', hashSource);
    return this;
  }

  /**
   * Build CSP string
   */
  build() {
    return Object.entries(this.directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Get report-only header
   */
  buildReportOnly() {
    const csp = this.build();
    return {
      'Content-Security-Policy-Report-Only': csp,
    };
  }

  /**
   * Get enforcing header
   */
  buildEnforcing() {
    const csp = this.build();
    return {
      'Content-Security-Policy': csp,
    };
  }
}

/**
 * Security headers configuration
 */
class SecurityHeadersConfig {
  constructor(environment = 'development') {
    this.environment = environment;
    this.headers = this._getDefaultHeaders();
  }

  /**
   * Get default security headers for environment
   */
  _getDefaultHeaders() {
    const base = {
      // HSTS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // XSS Protection (legacy browsers)
      'X-XSS-Protection': '1; mode=block',
      
      // Clickjacking protection
      'X-Frame-Options': 'DENY',
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions policy
      'Permissions-Policy': this._getPermissionsPolicy(),
      
      // Remove server header
      'Server': '',
      'X-Powered-By': '',
    };

    // Environment-specific modifications
    switch (this.environment) {
      case 'production':
        return {
          ...base,
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
          'Expect-CT': 'max-age=86400, enforce',
          'X-DNS-Prefetch-Control': 'off',
        };
      
      case 'staging':
      case 'beta':
        return {
          ...base,
          'X-Robots-Tag': 'noindex, nofollow', // Prevent indexing of staging sites
        };
      
      case 'development':
        return {
          ...base,
          'X-Frame-Options': 'SAMEORIGIN', // Allow iframes in development
          'Cache-Control': 'no-store', // Disable caching in development
        };
      
      default:
        return base;
    }
  }

  /**
   * Get permissions policy
   */
  _getPermissionsPolicy() {
    const policies = {
      'accelerometer': '()',
      'ambient-light-sensor': '()',
      'autoplay': '(self)',
      'battery': '()',
      'camera': '()',
      'display-capture': '()',
      'document-domain': '()',
      'encrypted-media': '(self)',
      'fullscreen': '(self)',
      'geolocation': '()',
      'gyroscope': '()',
      'magnetometer': '()',
      'microphone': '()',
      'midi': '()',
      'payment': '()',
      'picture-in-picture': '(self)',
      'publickey-credentials-get': '()',
      'screen-wake-lock': '()',
      'sync-xhr': '()',
      'usb': '()',
      'xr-spatial-tracking': '()',
    };

    return Object.entries(policies)
      .map(([feature, allowlist]) => `${feature}=${allowlist}`)
      .join(', ');
  }

  /**
   * Add custom header
   */
  addHeader(name, value) {
    this.headers[name] = value;
    return this;
  }

  /**
   * Remove header
   */
  removeHeader(name) {
    delete this.headers[name];
    return this;
  }

  /**
   * Get headers object
   */
  getHeaders() {
    return { ...this.headers };
  }

  /**
   * Get headers for specific context
   */
  getHeadersForContext(context = {}) {
    const headers = { ...this.headers };

    // Add CSP if enabled
    if (context.csp) {
      const cspBuilder = new CSPBuilder(this.environment);
      if (context.nonce) {
        cspBuilder.addNonce(context.nonce);
      }
      const cspHeaders = context.reportOnly 
        ? cspBuilder.buildReportOnly() 
        : cspBuilder.buildEnforcing();
      Object.assign(headers, cspHeaders);
    }

    // Add CORS headers if needed
    if (context.cors) {
      Object.assign(headers, this._getCORSHeaders(context.cors));
    }

    return headers;
  }

  /**
   * Get CORS headers
   */
  _getCORSHeaders(corsConfig) {
    const headers = {};
    
    if (corsConfig.origin) {
      headers['Access-Control-Allow-Origin'] = corsConfig.origin;
    }
    
    if (corsConfig.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    if (corsConfig.methods) {
      headers['Access-Control-Allow-Methods'] = corsConfig.methods.join(', ');
    }
    
    if (corsConfig.headers) {
      headers['Access-Control-Allow-Headers'] = corsConfig.headers.join(', ');
    }
    
    if (corsConfig.maxAge) {
      headers['Access-Control-Max-Age'] = String(corsConfig.maxAge);
    }
    
    return headers;
  }
}

/**
 * Security configuration manager
 */
class SecurityConfigManager {
  constructor(environment = 'development') {
    this.environment = environment;
    this.cspBuilder = new CSPBuilder(environment);
    this.headersConfig = new SecurityHeadersConfig(environment);
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    const configs = {
      production: {
        windowMs: 60 * 1000, // 1 minute
        max: 50, // 50 requests per minute
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        
        // Skip successful requests
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        
        // Store configuration
        store: 'redis', // Use Redis in production
        
        // Key generator
        keyGenerator: (req) => {
          // Use a combination of IP and user ID if authenticated
          const ip = req.ip || req.connection.remoteAddress;
          const userId = req.user?.id || 'anonymous';
          return `${ip}:${userId}`;
        },
        
        // Custom handler
        handler: (req, res) => {
          res.status(429).json({
            error: 'Too many requests',
            retryAfter: res.getHeader('Retry-After'),
          });
        },
      },
      
      staging: {
        windowMs: 60 * 1000,
        max: 200, // More lenient for testing
        message: 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
        store: 'memory',
      },
      
      development: {
        windowMs: 60 * 1000,
        max: 1000, // Very lenient for development
        message: 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
        store: 'memory',
        skip: () => true, // Skip rate limiting in development
      },
    };

    return configs[this.environment] || configs.development;
  }

  /**
   * Get CORS configuration
   */
  getCORSConfig() {
    const configs = {
      production: {
        origin: (origin, callback) => {
          const allowedOrigins = [
            process.env.NEXT_PUBLIC_APP_URL,
            'https://app.example.com',
            'https://www.example.com',
          ].filter(Boolean);
          
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
        maxAge: 86400, // 24 hours
        preflightContinue: false,
        optionsSuccessStatus: 204,
      },
      
      staging: {
        origin: true, // Allow all origins in staging
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge: 3600,
      },
      
      development: {
        origin: true, // Allow all origins
        credentials: true,
        methods: '*', // Allow all methods
        allowedHeaders: '*', // Allow all headers
        maxAge: 86400,
      },
    };

    return configs[this.environment] || configs.development;
  }

  /**
   * Get session configuration
   */
  getSessionConfig() {
    const configs = {
      production: {
        name: process.env.SESSION_COOKIE_NAME || '__ioc_session',
        secret: process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          secure: true, // HTTPS only
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60, // 1 hour
          domain: process.env.COOKIE_DOMAIN,
        },
        store: 'redis', // Use Redis session store
        genid: () => {
          // Generate cryptographically secure session ID
          const crypto = require('crypto');
          return crypto.randomBytes(32).toString('hex');
        },
      },
      
      staging: {
        name: '__ioc_session_staging',
        secret: process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: true,
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
        },
        store: 'memory',
      },
      
      development: {
        name: '__ioc_session_dev',
        secret: 'dev-secret-change-in-production',
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: false, // Allow HTTP in development
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        },
        store: 'memory',
      },
    };

    return configs[this.environment] || configs.development;
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return {
      // Password requirements
      password: {
        minLength: this.environment === 'production' ? 12 : 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: this.environment === 'production',
        maxLength: 128,
        
        // Password history
        preventReuse: this.environment === 'production' ? 5 : 0,
        
        // Password expiry
        expiryDays: this.environment === 'production' ? 90 : null,
      },
      
      // Account lockout
      lockout: {
        enabled: this.environment !== 'development',
        maxAttempts: 5,
        windowMinutes: 15,
        durationMinutes: 30,
      },
      
      // Two-factor authentication
      twoFactor: {
        enabled: this.environment === 'production',
        required: false,
        methods: ['totp', 'sms', 'email'],
      },
      
      // Session management
      session: {
        absoluteTimeout: 1000 * 60 * 60 * 8, // 8 hours
        idleTimeout: 1000 * 60 * 30, // 30 minutes
        renewalThreshold: 1000 * 60 * 5, // 5 minutes before expiry
        singleSession: this.environment === 'production',
      },
      
      // Token configuration
      tokens: {
        access: {
          expiresIn: '15m',
          algorithm: 'RS256',
        },
        refresh: {
          expiresIn: '7d',
          algorithm: 'RS256',
          rotate: true,
        },
        passwordReset: {
          expiresIn: '1h',
          oneTime: true,
        },
        emailVerification: {
          expiresIn: '24h',
          oneTime: true,
        },
      },
    };
  }

  /**
   * Get API security configuration
   */
  getAPISecurityConfig() {
    return {
      // API key configuration
      apiKeys: {
        enabled: true,
        prefix: 'ioc_',
        length: 32,
        hashAlgorithm: 'sha256',
        rotationDays: this.environment === 'production' ? 90 : null,
      },
      
      // Request validation
      validation: {
        maxBodySize: '10mb',
        maxFileSize: '50mb',
        allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
        sanitizeInput: true,
        validateContentType: true,
      },
      
      // Response security
      response: {
        removeHeaders: ['X-Powered-By', 'Server'],
        maskErrors: this.environment === 'production',
        includeRequestId: true,
      },
      
      // API versioning
      versioning: {
        enabled: true,
        header: 'X-API-Version',
        default: 'v1',
        deprecated: [],
        sunset: {},
      },
    };
  }

  /**
   * Get complete security configuration
   */
  getConfig() {
    return {
      environment: this.environment,
      headers: this.headersConfig.getHeaders(),
      csp: this.cspBuilder.build(),
      rateLimit: this.getRateLimitConfig(),
      cors: this.getCORSConfig(),
      session: this.getSessionConfig(),
      auth: this.getAuthConfig(),
      api: this.getAPISecurityConfig(),
    };
  }
}

/**
 * Create security configuration
 */
function createSecurityConfig(environment = process.env.NODE_ENV || 'development') {
  const manager = new SecurityConfigManager(environment);
  return manager.getConfig();
}

module.exports = {
  CSPBuilder,
  SecurityHeadersConfig,
  SecurityConfigManager,
  createSecurityConfig,
};