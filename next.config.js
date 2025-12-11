/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve builds folder - handle requests without .html extension
  async rewrites() {
    return [
      {
        // Handle requests without .html extension
        source: '/builds/:date/:model',
        destination: '/builds/:date/:model.html',
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

