/**
 * @fileoverview Shared Next.js configuration for IOC Core monorepo
 * @description Base Next.js configuration with common settings, extensible by apps
 */

const path = require('path');
const { getVersionEnvironmentVariables } = require('./version');

/**
 * Base Next.js configuration
 * @type {import('next').NextConfig}
 */
const baseConfig = {
  // Enable React strict mode for better error handling
  reactStrictMode: true,
  
  // Production optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  
  // Supabase images domain configuration
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Common security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Optimized webpack configuration
  webpack: (config, { dev, isServer, buildId }) => {
    // Get version information
    const versionEnv = getVersionEnvironmentVariables();
    
    // Add version information to webpack defines
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_ID': JSON.stringify(buildId),
        'process.env.BUILD_TIME': JSON.stringify(versionEnv.BUILD_TIMESTAMP),
        'process.env.BUILD_VERSION': JSON.stringify(versionEnv.BUILD_VERSION),
        'process.env.BUILD_COMMIT': JSON.stringify(versionEnv.BUILD_COMMIT_SHA),
        'process.env.BUILD_BRANCH': JSON.stringify(versionEnv.BUILD_BRANCH),
        'process.env.APP_VERSION': JSON.stringify(versionEnv.APP_VERSION),
        'process.env.SEMANTIC_VERSION': JSON.stringify(versionEnv.SEMANTIC_VERSION),
      })
    );
    
    // Handle Node.js compatibility issues
    if (isServer) {
      // Server-side fallbacks for Node.js compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        querystring: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        util: false,
        vm: false,
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        domain: false,
        events: false,
        readline: false,
        repl: false,
        v8: false,
        worker_threads: false,
        // Browser-specific globals
        window: false,
        document: false,
        navigator: false,
        location: false,
        self: false,
        global: false,
        globalThis: false,
      };
    }
    // Performance optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Add path aliases for better import resolution
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/utils': path.resolve(__dirname, 'utils'),
      '@/styles': path.resolve(__dirname, 'styles'),
      '@/hooks': path.resolve(__dirname, 'hooks'),
      '@/types': path.resolve(__dirname, 'types'),
    };

    // Optimization for production builds
    if (!dev) {
      // Enable webpack optimization
      config.optimization = {
        ...config.optimization,
        minimize: true,
        sideEffects: false,
        usedExports: true,
        innerGraph: true,
        providedExports: true,
        concatenateModules: true,
        flagIncludedChunks: true,
        // Split chunks for better caching
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
            hero: {
              test: /[\\/]node_modules[\\/]@heroicons[\\/]/,
              name: 'heroicons',
              priority: 15,
              reuseExistingChunk: true,
            },
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Tree shaking optimization
      config.resolve.mainFields = ['module', 'main'];
      
      // Enable module concatenation
      config.optimization.concatenateModules = true;
      
      // Reduce bundle size
      config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    }

    // Development optimizations
    if (dev) {
      // Faster builds in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };

      // Enable source maps for debugging
      config.devtool = 'cheap-module-source-map';
    }

    // Common module rules
    config.module.rules.push(
      // Handle SVG imports
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
      // Optimize font loading
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/fonts/',
            outputPath: 'static/fonts/',
          },
        },
      },
      // Common exclusions for infrastructure files
      {
        test: /\.(ts|tsx|js|jsx)$/,
        include: [
          /infrastructure\//,
          /archive\//,
          /refactoring\//,
          /testing\//,
          /terraform\//,
          /ioc-v3\.1\.1\//,
          /business\//,
          /tools\//,
          /scripts\//,
        ],
        use: 'null-loader',
      }
    );
    
    // Handle server-side externals
    if (isServer) {
      // Prevent bundling of server-only modules
      config.externals = config.externals || [];
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = (context, request, callback) => {
          if (request.startsWith('@supabase/supabase-js') || request.includes('self')) {
            return callback(null, `commonjs ${request}`);
          }
          return originalExternals(context, request, callback);
        };
      } else {
        config.externals.push({
          '@supabase/supabase-js': 'commonjs @supabase/supabase-js',
        });
      }
    }
    // Enable webpack bundle analyzer in analyze mode
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : '../analyze/client.html',
          openAnalyzer: false,
        })
      );
    }
    
    return config;
  },
  
  // Transpile packages for monorepo
  transpilePackages: ['@ioc/ui', '@ioc/lib', '@ioc/types', '@ioc-core/config'],
  
  // Base output configuration
  output: 'standalone',
  
  // Common experimental features and optimizations
  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      '@supabase/supabase-js',
      '@supabase/ssr',
      'framer-motion',
      'react-chartjs-2',
      'chart.js',
      'date-fns',
      'lodash'
    ],
    webpackBuildWorker: true,
    optimizeCss: true,
    scrollRestoration: true,
    cpus: Math.max(1, require('os').cpus().length - 1),
    workerThreads: true,
    esmExternals: true,
    serverComponentsExternalPackages: ['sharp', '@supabase/supabase-js', '@supabase/ssr'],
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // SWC minification is enabled by default in Next.js 13+
  // swcMinify: true, // Deprecated - now enabled by default

  // Optimize bundle splitting
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },
};

/**
 * Create environment-specific Next.js configuration
 * @param {Object} options - Configuration options
 * @param {string} options.env - Environment (development, staging, production)
 * @param {Object} options.extend - Additional configuration to merge
 * @returns {import('next').NextConfig} Extended Next.js configuration
 */
function createNextConfig(options = {}) {
  const { env = 'development', extend = {} } = options;
  
  // Get version environment variables
  const versionEnv = getVersionEnvironmentVariables();
  
  const config = {
    ...baseConfig,
    ...extend,
    // Merge version environment variables
    env: {
      ...versionEnv,
      ...baseConfig.env,
      ...extend.env,
    },
  };
  
  // Environment-specific configurations
  if (env === 'development') {
    config.typescript = {
      ignoreBuildErrors: false,
    };
    config.eslint = {
      ignoreDuringBuilds: false,
    };
  }
  
  if (env === 'staging') {
    config.env = {
      ...config.env,
      CUSTOM_KEY: 'staging-environment',
    };
    config.eslint = {
      ignoreDuringBuilds: true,
    };
  }
  
  if (env === 'production') {
    config.env = {
      ...config.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
    config.eslint = {
      ignoreDuringBuilds: true,
    };
  }
  
  return config;
}

module.exports = {
  baseConfig,
  createNextConfig,
  // Export default for direct usage
  default: baseConfig,
};