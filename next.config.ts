import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
