import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling server-only packages
  serverExternalPackages: ['bullmq', 'ioredis', '@prisma/client', 'pg'],

  // Suppress source map warnings from dependencies
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
