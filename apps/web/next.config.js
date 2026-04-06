/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@must-iq/shared-types'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
};
module.exports = nextConfig;
