import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/api/images': ['./data/precomputed/**/*'],
    '/api/change-detection': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/api/ai-insight': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
  },
};

export default nextConfig;
