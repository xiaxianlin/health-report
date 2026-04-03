import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Initialize OpenNext Cloudflare for development
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev()).catch(() => {});

export default nextConfig;
