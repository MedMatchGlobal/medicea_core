/** @type {import('next').NextConfig} */
const nextConfig = {
  // Membership cookies and CSRF checks intentionally use one preview origin.
  // Send browser entry pages there before sign-in/search; never redirect APIs.
  async redirects() {
    if (process.env.VERCEL_ENV !== 'preview' || process.env.MEDICEA_MEMBERSHIP_PREVIEW !== 'true') return [];
    const deployment = process.env.VERCEL_URL;
    let canonical;
    try { canonical = new URL(process.env.MEDICEA_MEMBERSHIP_ORIGIN || ''); } catch { return []; }
    if (!deployment || !/^[a-z0-9-]+\.vercel\.app$/i.test(deployment) || canonical.protocol !== 'https:' || canonical.username || canonical.password || canonical.pathname !== '/' || canonical.search || canonical.hash || canonical.port || canonical.hostname === deployment) return [];
    return ['/', '/pets', '/membership/:path*'].map(source => ({
      source,
      has: [{type:'host',value:deployment.replaceAll('.', '\\.')}],
      destination: canonical.origin + source,
      permanent: false,
    }));
  },
  outputFileTracingRoot: __dirname,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  eslint: {
    // Let the build succeed even if ESLint has issues (we’ll still get preview warnings locally)
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
