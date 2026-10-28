import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*'],
    '/api/images': ['./data/precomputed/**/*'],
    '/api/change-detection': ['./data/precomputed/**/*', './data/case-studies/**/*'],
    '/api/ai-insight': ['./data/precomputed/**/*', './data/case-studies/**/*'],
    '/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*'],
  },
};

export default nextConfig;
