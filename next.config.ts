// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth']
  }
};

export default nextConfig;
