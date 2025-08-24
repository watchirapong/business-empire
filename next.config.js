/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
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
    return config;
  },
  serverExternalPackages: ['discord.js', 'zlib-sync', 'bufferutil', 'utf-8-validate'],
};

module.exports = nextConfig;
