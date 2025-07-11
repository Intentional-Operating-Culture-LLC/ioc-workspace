/** @type {import('next').NextConfig} */
const { createNextConfig } = require('@ioc-core/config/next');

const nextConfig = createNextConfig({
  env: 'development',
  extend: {
    eslint: {
      // Disable ESLint during builds for dev environment
      ignoreDuringBuilds: true,
    },
    experimental: {
      turbo: {
        rules: {
          '*.svg': {
            loaders: ['@svgr/webpack'],
            as: '*.js',
          },
        },
      },
      optimizePackageImports: ['@heroicons/react', 'lucide-react']
    },
    images: {
      domains: ['via.placeholder.com', 'ui-avatars.com', 'localhost'],
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
          pathname: '/storage/v1/object/public/**',
        },
      ],
    },
    env: {
      APP_ENV: 'development',
      APP_NAME: 'IOC Developer Sandbox',
      APP_VERSION: '1.0.0',
      APP_ENVIRONMENT: 'development',
    },
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ];
    },
    async rewrites() {
      return [
        {
          source: '/sandbox/:path*',
          destination: '/dev/:path*',
        },
      ];
    },
    webpack: (config, { dev, isServer }) => {
      // Development-specific optimizations
      if (dev) {
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
        };
      }

      return config;
    },
  },
});

module.exports = nextConfig;