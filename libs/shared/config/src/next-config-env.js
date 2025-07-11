/**
 * @fileoverview Environment-specific Next.js configurations
 * @description Advanced Next.js configurations tailored for each environment
 */

const path = require('path');
const { baseConfig } = require('./next.config.js');
const { getEnvironmentConfig } = require('./env-schema');
const { getVersionEnvironmentVariables, generateVersionString } = require('./version');

/**
 * Security headers configuration by environment
 */
const getSecurityHeaders = (env) => {
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
  ];

  // Environment-specific headers
  if (env === 'production') {
    baseHeaders.push(
      {
        key: 'X-Frame-Options',
        value: envConfig.securityConfig.xFrameOptions || 'DENY',
      },
      {
        key: 'Strict-Transport-Security',
        value: envConfig.securityConfig.hstsEnabled 
          ? 'max-age=31536000; includeSubDomains; preload'
          : 'max-age=0',
      },
      {
        key: 'X-Robots-Tag',
        value: 'index, follow',
      }
    );
  } else if (env === 'staging') {
    baseHeaders.push(
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      }
    );
  } else {
    baseHeaders.push(
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      }
    );
  }

  // Content Security Policy
  if (envConfig.securityConfig.cspEnabled) {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    if (env === 'production') {
      cspDirectives.push(
        "script-src 'self' 'unsafe-inline' https://www.google-analytics.com",
        "connect-src 'self' https://api.stripe.com https://www.google-analytics.com"
      );
    } else {
      cspDirectives.push(
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "connect-src 'self' ws: wss: https:"
      );
    }

    baseHeaders.push({
      key: 'Content-Security-Policy',
      value: cspDirectives.join('; '),
    });
  }

  return baseHeaders;
};

/**
 * Production Next.js configuration
 */
const productionConfig = {
  ...baseConfig,
  
  // Production-specific settings
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Image optimization for production
  images: {
    ...baseConfig.images,
    domains: ['localhost', 'ioc-core.example.com'],
    remotePatterns: [
      ...baseConfig.images.remotePatterns,
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/ioc-production/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Production headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: getSecurityHeaders('production'),
      },
      {
        source: '/api/(.*)',
        headers: [
          ...getSecurityHeaders('production'),
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Production redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: true,
      },
      {
        source: '/health',
        destination: '/api/health',
        permanent: true,
      },
    ];
  },
  
  // Production rewrites
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://api.example.com/:path*',
      },
    ];
  },
  
  // Production webpack configuration
  webpack: (config, { dev, isServer, buildId }) => {
    // Apply base webpack config
    config = baseConfig.webpack(config, { dev, isServer, buildId });
    
    // Production-specific optimizations
    if (!dev) {
      // Enable aggressive optimizations
      config.optimization = {
        ...config.optimization,
        minimize: true,
        minimizer: [
          ...config.optimization.minimizer,
        ],
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
          },
        },
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
      
      // Production-specific plugins
      config.plugins.push(
        // Add production-specific plugins here
      );
    }
    
    return config;
  },
  
  // Production compiler settings
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
    reactRemoveProperties: true,
    styledComponents: true,
  },
  
  // Production experimental features
  experimental: {
    ...baseConfig.experimental,
    optimizePackageImports: [
      ...baseConfig.experimental.optimizePackageImports,
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
    ],
    turbotrace: {
      logLevel: 'error',
    },
  },
  
  // Production output settings
  output: 'standalone',
  trailingSlash: false,
  
  // Production environment variables
  env: {
    ...getVersionEnvironmentVariables(),
    CUSTOM_KEY: 'production-environment',
    BUILD_TIME: new Date().toISOString(),
    APP_ENVIRONMENT: 'production',
    VERSION_STRING: generateVersionString({ format: 'compact' }),
  },
};

/**
 * Beta/Staging Next.js configuration
 */
const betaConfig = {
  ...baseConfig,
  
  // Beta-specific settings
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Beta image configuration
  images: {
    ...baseConfig.images,
    domains: ['localhost', 'beta.ioc-core.example.com'],
    remotePatterns: [
      ...baseConfig.images.remotePatterns,
      {
        protocol: 'https',
        hostname: 'beta-cdn.example.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/ioc-beta/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600, // 1 hour
    dangerouslyAllowSVG: true, // Allow SVG in beta for testing
  },
  
  // Beta headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          ...getSecurityHeaders('staging'),
          {
            key: 'X-Environment',
            value: 'beta',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          ...getSecurityHeaders('staging'),
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Beta redirects
  async redirects() {
    return [
      {
        source: '/beta-feedback',
        destination: '/feedback',
        permanent: false,
      },
    ];
  },
  
  // Beta rewrites
  async rewrites() {
    return [
      {
        source: '/api/beta/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Beta webpack configuration
  webpack: (config, { dev, isServer, buildId }) => {
    // Apply base webpack config
    config = baseConfig.webpack(config, { dev, isServer, buildId });
    
    // Beta-specific optimizations
    if (!dev) {
      // Enable source maps for beta debugging
      config.devtool = 'source-map';
      
      // Beta-specific plugins
      config.plugins.push(
        // Add beta-specific plugins here
      );
    }
    
    return config;
  },
  
  // Beta compiler settings
  compiler: {
    removeConsole: false, // Keep console logs in beta
    reactRemoveProperties: false,
    styledComponents: true,
  },
  
  // Beta experimental features
  experimental: {
    ...baseConfig.experimental,
    instrumentationHook: true,
    logging: 'verbose',
  },
  
  // Beta environment variables
  env: {
    ...getVersionEnvironmentVariables(),
    CUSTOM_KEY: 'beta-environment',
    BUILD_TIME: new Date().toISOString(),
    BETA_FEATURES: 'true',
    APP_ENVIRONMENT: 'beta',
    VERSION_STRING: generateVersionString({ format: 'full', includeCommit: true, includeBranch: true }),
  },
};

/**
 * Development Next.js configuration
 */
const developmentConfig = {
  ...baseConfig,
  
  // Development-specific settings
  compress: false,
  poweredByHeader: true,
  generateEtags: false,
  
  // Development image configuration
  images: {
    ...baseConfig.images,
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      ...baseConfig.images.remotePatterns,
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 60, // 1 minute
    dangerouslyAllowSVG: true,
  },
  
  // Development headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          ...getSecurityHeaders('development'),
          {
            key: 'X-Environment',
            value: 'development',
          },
        ],
      },
    ];
  },
  
  // Development webpack configuration
  webpack: (config, { dev, isServer, buildId }) => {
    // Apply base webpack config
    config = baseConfig.webpack(config, { dev, isServer, buildId });
    
    // Development-specific optimizations
    if (dev) {
      // Enable hot module replacement
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/.next',
          '**/dist',
          '**/build',
        ],
      };
      
      // Development plugins
      config.plugins.push(
        // Add development-specific plugins here
      );
    }
    
    return config;
  },
  
  // Development compiler settings
  compiler: {
    removeConsole: false,
    reactRemoveProperties: false,
    styledComponents: true,
  },
  
  // Development experimental features
  experimental: {
    ...baseConfig.experimental,
    instrumentationHook: true,
    logging: 'verbose',
  },
  
  // Development environment variables
  env: {
    ...getVersionEnvironmentVariables(),
    CUSTOM_KEY: 'development-environment',
    BUILD_TIME: new Date().toISOString(),
    DEV_MODE: 'true',
    APP_ENVIRONMENT: 'development',
    VERSION_STRING: generateVersionString({ format: 'full', includeCommit: true, includeBranch: true, includeDate: true }),
  },
  
  // Development TypeScript and ESLint settings
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['pages', 'components', 'lib', 'src'],
  },
};

/**
 * Create environment-specific Next.js configuration
 */
function createEnvironmentConfig(environment = 'development', customConfig = {}) {
  let baseEnvConfig;
  
  switch (environment) {
    case 'production':
      baseEnvConfig = productionConfig;
      break;
    case 'staging':
      baseEnvConfig = betaConfig;
      break;
    case 'development':
      baseEnvConfig = developmentConfig;
      break;
    default:
      baseEnvConfig = developmentConfig;
  }
  
  // Merge custom configuration
  return {
    ...baseEnvConfig,
    ...customConfig,
    // Deep merge specific objects
    images: {
      ...baseEnvConfig.images,
      ...customConfig.images,
    },
    experimental: {
      ...baseEnvConfig.experimental,
      ...customConfig.experimental,
    },
    compiler: {
      ...baseEnvConfig.compiler,
      ...customConfig.compiler,
    },
    env: {
      ...getVersionEnvironmentVariables(),
      ...baseEnvConfig.env,
      ...customConfig.env,
    },
  };
}

module.exports = {
  productionConfig,
  betaConfig,
  developmentConfig,
  createEnvironmentConfig,
  getSecurityHeaders,
};