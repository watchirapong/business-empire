/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable webpack build worker
    webpackBuildWorker: true,
  },

  // Configure Turbopack for faster builds
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Optimize build output
  output: 'standalone',

  // Enable build performance optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!isServer) {
      // Don't bundle Discord.js on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'discord.js': false,
        'zlib-sync': false,
        'bufferutil': false,
        'utf-8-validate': false,
      };
    }

    // Add performance optimizations
    if (!dev) {
      // Enable webpack optimizations for production
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
          },
        },
      };

      // Add parallel processing for faster builds
      config.parallelism = 4;
    }

    return config;
  },

  serverExternalPackages: ['discord.js', 'zlib-sync', 'bufferutil', 'utf-8-validate'],

  // Add build performance monitoring
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
