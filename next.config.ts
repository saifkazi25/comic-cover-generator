// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Ignore ESLint errors during Vercel builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Enable experimental options (optional)
  experimental: {
    staleTimes: { dynamic: 0 },
  },

  // ✅ Ensure it works with Vercel’s output optimization
  output: "standalone",
};

export default nextConfig;
