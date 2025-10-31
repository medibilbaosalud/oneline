/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [{ source: '/github', destination: '/api/auth/callback/github' }];
  },
};

module.exports = nextConfig;
