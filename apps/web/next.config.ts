import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import { buildSecurityHeaders } from './src/lib/security-headers';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image only (`next start` does not support it). The
  // tracing root is the repo root so the workspace's hoisted node_modules are included.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(apiUrl, process.env.NODE_ENV !== 'production'),
      },
    ];
  },
};

export default nextConfig;
