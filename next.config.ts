import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
  },
  logging: {
    fetches: { fullUrl: false },
  },
};
export default nextConfig;
