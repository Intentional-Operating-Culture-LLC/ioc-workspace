/**
 * @fileoverview Advanced Next.js configuration for different environments
 * @description Environment-specific Next.js optimizations and security settings
 */

const { SecurityHeadersConfig } = require('./security-config-advanced');

/**
 * Create Next.js configuration for environment
 */
function createNextConfig(environment = 'development') {
  const isDev = environment === 'development';
  const isProd = environment === 'production';
  const isBeta = environment === 'staging' || environment === 'beta';

  // Security headers
  const securityHeaders = new SecurityHeadersConfig(environment);
  
  const config = {
    // Deployment target
    target: 'server',
    
    // Environment
    env: {
      NODE_ENV: environment,
      BUILD_ENV: environment,
      BUILD_TIME: new Date().toISOString(),
    },
    
    // TypeScript configuration
    typescript: {
      ignoreBuildErrors: isDev,
      tsconfigPath: './tsconfig.json',
    },
    
    // ESLint configuration
    eslint: {
      ignoreDuringBuilds: isDev,
      dirs: ['app', 'components', 'lib', 'utils'],
    },
    
    // Production optimizations
    compress: isProd,
    poweredByHeader: false,
    generateEtags: isProd,
    
    // React configuration
    reactStrictMode: true,
    
    // Compiler options
    compiler: {
      // Remove console logs in production
      removeConsole: isProd ? {
        exclude: ['error', 'warn'],
      } : false,
      
      // Emotion support
      emotion: true,
      
      // Styled components support
      styledComponents: {
        displayName: !isProd,
        ssr: true,
        fileName: !isProd,
        cssProp: true,
        minify: isProd,
        pure: isProd,
      },
    },
    
    // SWC minification
    swcMinify: true,
    
    // Webpack configuration
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
      // Production optimizations
      if (isProd) {
        config.optimization = {
          ...config.optimization,
          minimize: true,
          sideEffects: false,
          usedExports: true,
          innerGraph: true,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              framework: {
                name: 'framework',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
                priority: 40,
                enforce: true,
              },
              lib: {
                test(module) {
                  return module.size() > 160000 &&
                    /node_modules[/\\]/.test(module.identifier());
                },
                name(module) {
                  const hash = require('crypto')
                    .createHash('sha1')
                    .update(module.identifier())
                    .digest('hex')
                    .substring(0, 8);
                  return `lib-${hash}`;
                },
                priority: 30,
                minChunks: 1,
                reuseExistingChunk: true,
              },
              commons: {
                name: 'commons',
                chunks: 'all',
                minChunks: 2,
                priority: 20,
              },
              shared: {
                name(module, chunks) {
                  return crypto
                    .createHash('sha1')
                    .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                    .digest('hex') + (isServer ? '-server' : '-client');
                },
                priority: 10,
                minChunks: 2,
                reuseExistingChunk: true,
              },
            },
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
          },
        };
      }
      
      // Bundle analyzer
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: isServer
              ? '../bundles/server.html'
              : '../bundles/client.html',
            openAnalyzer: false,
          })
        );
      }
      
      // Additional plugins
      config.plugins.push(
        new webpack.DefinePlugin({
          __DEV__: !isProd,
          __PROD__: isProd,
          __BETA__: isBeta,
          __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
          __BUILD_ID__: JSON.stringify(buildId),
        })
      );
      
      return config;
    },
    
    // Image optimization
    images: {
      domains: getProdDomains(environment),
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 60,
      dangerouslyAllowSVG: false,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      deviceSizes: [640, 768, 1024, 1280, 1920],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    
    // Headers configuration
    async headers() {
      const headers = securityHeaders.getHeaders();
      
      return [
        {
          source: '/(.*)',
          headers: Object.entries(headers).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        },
        {
          source: '/api/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          ],
        },
        {
          source: '/_next/static/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ];
    },
    
    // Redirects
    async redirects() {
      return getRedirects(environment);
    },
    
    // Rewrites
    async rewrites() {
      return getRewrites(environment);
    },
    
    // API configuration
    api: {
      bodyParser: {
        sizeLimit: '10mb',
      },
      responseLimit: '10mb',
      externalResolver: true,
    },
    
    // Experimental features
    experimental: {
      appDir: true,
      serverActions: true,
      serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
      optimizeCss: isProd,
      scrollRestoration: true,
      // Enable incremental static regeneration
      isrFlushToDisk: isProd,
      workerThreads: isProd,
      cpus: isProd ? 4 : 1,
      // Output file tracing
      outputFileTracingRoot: undefined,
      // Optimize package imports
      optimizePackageImports: ['lodash', 'date-fns', '@mui/material', '@mui/icons-material'],
    },
    
    // Output configuration
    output: isProd ? 'standalone' : undefined,
    
    // Trailing slash
    trailingSlash: false,
    
    // Base path (if needed)
    basePath: '',
    
    // Asset prefix (CDN)
    assetPrefix: isProd ? process.env.NEXT_PUBLIC_CDN_URL : '',
    
    // Page extensions
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    
    // Disable x-powered-by header
    poweredByHeader: false,
    
    // Production browser source maps
    productionBrowserSourceMaps: false,
    
    // Optimize fonts
    optimizeFonts: true,
    
    // Module aliases
    modularizeImports: {
      '@mui/material': {
        transform: '@mui/material/{{member}}',
      },
      '@mui/icons-material': {
        transform: '@mui/icons-material/{{member}}',
      },
      'lodash': {
        transform: 'lodash/{{member}}',
      },
    },
  };
  
  // Environment-specific overrides
  if (isDev) {
    config.reactStrictMode = true;
    config.compress = false;
    config.generateEtags = false;
  }
  
  if (isBeta) {
    config.experimental.isrMemoryCacheSize = 50; // MB
    config.experimental.largePageDataBytes = 128 * 1024; // 128KB
  }
  
  if (isProd) {
    config.experimental.isrMemoryCacheSize = 100; // MB
    config.experimental.largePageDataBytes = 256 * 1024; // 256KB
    // Enable React production profiling
    if (process.env.PROFILE === 'true') {
      config.reactProductionProfiling = true;
    }
  }
  
  return config;
}

/**
 * Get allowed image domains for environment
 */
function getProdDomains(environment) {
  const baseDomains = [
    'localhost',
    'ioc-core.example.com',
    'beta.ioc-core.example.com',
  ];
  
  if (environment === 'production') {
    return [
      ...baseDomains,
      'cdn.example.com',
      's3.amazonaws.com',
      'storage.googleapis.com',
    ];
  }
  
  return baseDomains;
}

/**
 * Get redirects for environment
 */
function getRedirects(environment) {
  const redirects = [];
  
  // Add environment-specific redirects
  if (environment === 'production') {
    redirects.push({
      source: '/beta',
      destination: 'https://beta.ioc-core.example.com',
      permanent: false,
    });
  }
  
  return redirects;
}

/**
 * Get rewrites for environment
 */
function getRewrites(environment) {
  const rewrites = {
    beforeFiles: [],
    afterFiles: [],
    fallback: [],
  };
  
  // API rewrites
  if (environment !== 'development') {
    rewrites.afterFiles.push({
      source: '/api/v1/:path*',
      destination: `${process.env.API_BASE_URL}/v1/:path*`,
    });
  }
  
  return rewrites;
}

module.exports = {
  createNextConfig,
  getProdDomains,
  getRedirects,
  getRewrites,
};