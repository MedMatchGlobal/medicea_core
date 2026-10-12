/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  eslint: {
    // Let the build succeed even if ESLint has issues (we’ll still get preview warnings locally)
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
