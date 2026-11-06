import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*', './data/nisar/**/*', './data/exposure/**/*'],
    '/api/images': ['./data/precomputed/**/*'],
    '/api/change-detection': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/api/ai-insight': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*'],
    '/api/nisar/**/*': ['./data/nisar/**/*'],
    '/api/exposure/**/*': ['./data/exposure/**/*'],
    '/explore': ['./data/nisar/**/*', './data/exposure/**/*'],
    '/**/*': ['./data/precomputed/**/*', './data/case-studies/**/*', './data/sensitivity/**/*', './data/nisar/**/*', './data/exposure/**/*'],
  },
};

export default nextConfig;
