/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@cursor/sdk'],
  // Redirect old model paths to query param format
  async redirects() {
    return [
      {
        source: '/opus-4.6',
        destination: '/?model=opus-4.6',
        permanent: true,
      },
      {
        source: '/opus-4.6-max',
        destination: '/?model=opus-4.6-max',
        permanent: true,
      },
      {
        source: '/composer-2',
        destination: '/?model=composer-2',
        permanent: true,
      },
      {
        source: '/composer-1.5',
        destination: '/?model=composer-1.5',
        permanent: true,
      },
      {
        source: '/gpt-5.4-high-fast',
        destination: '/?model=gpt-5.4-high-fast',
        permanent: true,
      },
      {
        source: '/gpt-5.5-high-fast',
        destination: '/?model=gpt-5.5-high-fast',
        permanent: true,
      },
      {
        source: '/gpt-5.3-codex-high',
        destination: '/?model=gpt-5.3-codex-high',
        permanent: true,
      },
      {
        source: '/gpt-5.3-codex-xhigh',
        destination: '/?model=gpt-5.3-codex-xhigh',
        permanent: true,
      },
      {
        source: '/gpt-5.3-spark-xhigh',
        destination: '/?model=gpt-5.3-spark-xhigh',
        permanent: true,
      },
      {
        source: '/gemini-3.1-pro',
        destination: '/?model=gemini-3.1-pro',
        permanent: true,
      },
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
        source: '/builds/:date/:model',
        destination: '/builds/:date/:model.html',
      },
      {
        source: '/dither',
        destination: '/dither/index.html',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/games/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "sandbox allow-scripts allow-pointer-lock allow-forms allow-modals allow-presentation",
              "default-src 'self' https://unpkg.com https://esm.sh https://cdn.jsdelivr.net",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://esm.sh https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "media-src 'self' data: blob:",
              "worker-src 'self' blob:",
              "connect-src 'none'",
              "frame-ancestors 'self'",
              "base-uri 'none'",
              "form-action 'none'",
            ].join('; '),
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
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

