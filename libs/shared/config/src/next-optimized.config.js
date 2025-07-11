/** @type {import('next').NextConfig} */

// Performance optimization configuration for Next.js
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Compiler options for optimization
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // Enable React optimization
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  
  // Experimental features for performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      '@heroicons/react',
      'lodash-es',
      'date-fns',
      '@supabase/supabase-js',
      'framer-motion',
    ],
    
    // Optimize server components
    serverComponentsExternalPackages: [
      'sharp',
      'ioredis',
      'bcryptjs',
    ],
    
    // Enable parallel routes optimization
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
    
    // Memory-based caching in development
    isrMemoryCacheSize: 0,
    
    // Optimize CSS
    optimizeCss: true,
  },
  
  // Webpack configuration for bundle optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev) {
      // Enable module concatenation (scope hoisting)
      config.optimization.concatenateModules = true;
      
      // Optimize chunk splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Separate chunks for large libraries
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          ui: {
            name: 'ui',
            test: /[\\/]packages[\\/]ui[\\/]/,
            chunks: 'all',
            priority: 25,
          },
        },
      };
      
      // Minimize bundle size
      config.optimization.minimize = true;
      
      // Use contenthash for better caching
      config.output.filename = isServer
        ? '[name].js'
        : 'static/chunks/[name].[contenthash].js';
      config.output.chunkFilename = isServer
        ? '[name].js'
        : 'static/chunks/[name].[contenthash].js';
    }
    
    // Add performance hints
    if (!isServer && !dev) {
      config.performance = {
        hints: 'warning',
        maxAssetSize: 250000, // 250kb
        maxEntrypointSize: 250000, // 250kb
      };
    }
    
    // Ignore unnecessary files
    config.module.noParse = /^(vue|vue-router|vuex|vuex-router-sync)$/;
    
    // Add webpack bundle analyzer in analyze mode
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }
    
    return config;
  },
  
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      // Cache static assets
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Cache images
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Cache fonts
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  // Redirects for optimization
  async redirects() {
    return [
      // Remove trailing slashes
      {
        source: '/:path*/',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
  
  // Enable compression
  compress: true,
  
  // PoweredByHeader
  poweredByHeader: false,
  
  // Generate ETags
  generateEtags: true,
  
  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Trailing slash
  trailingSlash: false,
  
  // Output configuration
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    // Skip type checking in production builds (run separately)
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Skip ESLint in production builds (run separately)
    ignoreDuringBuilds: false,
  },
};

// Export configuration
module.exports = nextConfig;