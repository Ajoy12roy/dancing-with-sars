import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*', './data/nisar/**/*'],
    '/api/images': ['./data/precomputed/**/*'],
    '/api/change-detection': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/api/ai-insight': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/api/nisar/**/*': ['./data/nisar/**/*'],
    '/explore': ['./data/nisar/**/*'],
    '/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*', './data/nisar/**/*'],
  },
};

export default nextConfig;
