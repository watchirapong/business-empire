import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations - swcMinify is deprecated in Next.js 15
  
  // Enable Turbopack for faster builds
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Experimental features for better performance
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
    // Enable webpack build worker for faster builds
    webpackBuildWorker: true,
    // Enable parallel builds
    parallelServerBuildTraces: true,
  },

  // External packages that shouldn't be bundled
  serverExternalPackages: ['discord.js', 'zlib-sync', 'bufferutil', 'utf-8-validate'],
  
  // Build optimizations
  output: 'standalone',

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!isServer) {
      // Don't bundle server-only packages on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'discord.js': false,
        'zlib-sync': false,
        'bufferutil': false,
        'utf-8-validate': false,
        'mongoose': false,
      };
    }

    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            admin: {
              test: /[\\/]components[\\/]admin[\\/]/,
              name: 'admin-components',
              chunks: 'all',
              priority: 5,
            },
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)/,
              name: 'charts',
              chunks: 'all',
              priority: 8,
            },
          },
        },
      };
      
      // Enable parallel processing
      config.parallelism = 4;
    }

    return config;
  },

  // Development optimizations
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Allowed development origins
  allowedDevOrigins: [
    'https://06ad6e864e36.ngrok.app',
    'https://*.ngrok.app',
    'https://*.ngrok.io'
  ],
  
  // Static file serving
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  
  // CORS headers for file uploads
  async headers() {
    return [
      {
        source: '/api/shop/upload-file',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
