let withPWA = (config) => config;

try {
  const createPWA = require("next-pwa");
  withPWA = createPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
  });
} catch (error) {
  console.warn(
    "[pwa] next-pwa is not installed. Run `npm install` to enable service worker generation.",
  );
  if (process.env.NODE_ENV === "production") {
    throw error;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [{ source: "/github", destination: "/api/auth/callback/github" }];
  },
};

module.exports = withPWA(nextConfig);
