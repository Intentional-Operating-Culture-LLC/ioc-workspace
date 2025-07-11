/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolate the admin app from parent directories
  experimental: {
    externalDir: false, // Don't compile files outside this directory
  },
  
  // Only compile files within the admin app
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Ignore TypeScript errors during build (temporary)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  env: {
    NEXT_PUBLIC_APP_NAME: 'IOC Admin Dashboard',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Real-time Assessment Metrics and Administration',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://admin.iocframework.com',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Optimize for Vercel
  output: 'standalone',
  swcMinify: true,
  images: {
    domains: ['admin.iocframework.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*'
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://admin.iocframework.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ]
      }
    ];
  }
};

module.exports = nextConfig;