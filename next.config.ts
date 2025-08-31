import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['discord.js', 'zlib-sync', 'bufferutil', 'utf-8-validate'],
  experimental: {
    serverComponentsExternalPackages: ['discord.js', 'zlib-sync', 'bufferutil', 'utf-8-validate'],
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  allowedDevOrigins: [
    'https://06ad6e864e36.ngrok.app',
    'https://*.ngrok.app',
    'https://*.ngrok.io'
  ],
  // Enable static file serving for uploads
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  // Configure API routes for large file uploads
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
