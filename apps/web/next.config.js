/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@must-iq/shared-types', '@must-iq/db', '@must-iq/config'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
};
module.exports = nextConfig;
