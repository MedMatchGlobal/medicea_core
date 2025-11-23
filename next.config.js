/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Let the build succeed even if ESLint has issues (we’ll still get preview warnings locally)
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
