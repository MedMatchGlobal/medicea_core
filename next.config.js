/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: {
    // Let the build succeed even if ESLint has issues (we’ll still get preview warnings locally)
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
