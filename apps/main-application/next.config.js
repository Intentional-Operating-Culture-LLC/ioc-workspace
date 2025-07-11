/** @type {import('next').NextConfig} */
const { createNextConfig } = require('@ioc-core/config/next');

const nextConfig = createNextConfig({
  env: 'production',
  extend: {
    // Add any production-specific overrides here
    experimental: {
      optimizePackageImports: ['@heroicons/react']
    },
    // Enhanced security configuration for production
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
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=(), payment=(self), fullscreen=(self)',
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
              value: 'cross-origin',
            },
          ],
        },
        {
          source: '/api/(.*)',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: 'https://iocframework.com',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, POST, PUT, DELETE, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
            },
            {
              key: 'Access-Control-Allow-Credentials',
              value: 'true',
            },
            {
              key: 'Access-Control-Max-Age',
              value: '86400',
            },
          ],
        },
      ];
    },
  },
});

module.exports = nextConfig;