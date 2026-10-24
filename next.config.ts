import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/precomputed/**/*'],
    '/api/images': ['./data/precomputed/**/*'],
    '/api/change-detection': ['./data/precomputed/**/*'],
  },
};

export default nextConfig;
