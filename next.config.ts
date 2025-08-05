// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Don’t block production builds on ESLint warnings/errors
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Make sure the App Directory features are enabled
    appDir: true,
  },
};

export default nextConfig;
