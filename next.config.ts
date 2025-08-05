// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Don’t let ESLint errors block your production build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // SWC minification is on by default in Next 15, no need to specify it
};

export default nextConfig;
