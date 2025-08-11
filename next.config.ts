import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'https://06ad6e864e36.ngrok.app',
    'https://*.ngrok.app',
    'https://*.ngrok.io'
  ]
};

export default nextConfig;
