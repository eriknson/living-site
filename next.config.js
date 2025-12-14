/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect old model paths to query param format
  async redirects() {
    return [
      {
        source: '/opus-4.5',
        destination: '/?model=opus-4.5',
        permanent: true,
      },
      {
        source: '/composer-1',
        destination: '/?model=composer-1',
        permanent: true,
      },
      {
        source: '/gpt-5.1-codex',
        destination: '/?model=gpt-5.1-codex',
        permanent: true,
      },
      {
        source: '/gpt-5.1-codex-max',
        destination: '/?model=gpt-5.1-codex-max',
        permanent: true,
      },
      {
        source: '/gemini-3-pro',
        destination: '/?model=gemini-3-pro',
        permanent: true,
      },
    ];
  },
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

