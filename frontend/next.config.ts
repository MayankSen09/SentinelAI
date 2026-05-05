import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Turbopack config for Solana/Anchor compatibility (Next.js 16+) */
  turbopack: {},

  /* Output standalone for optimized Docker/Vercel deployments */
  output: "standalone",

  /* Allow all image sources */
  images: {
    unoptimized: true,
  },

  /* Ignore ESLint errors during build */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* Ignore TypeScript errors during build */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
