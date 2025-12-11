/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve builds folder as static assets
  async rewrites() {
    return [
      {
        source: '/builds/:path*',
        destination: '/builds/:path*',
      },
    ];
  },
  // Exclude infra folder from Next.js compilation
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/infra/**', '**/data/**', '**/scripts/**'],
    };
    return config;
  },
};

export default nextConfig;
