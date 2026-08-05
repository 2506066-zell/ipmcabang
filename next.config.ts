import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Aktifkan strict mode React
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },

  // Redirects dari URL lama (backward compatibility)
  async redirects() {
    return [
      { source: '/articles.html', destination: '/articles', permanent: true },
      { source: '/quiz.html', destination: '/quiz', permanent: true },
      { source: '/quiz-gamified.html', destination: '/quiz', permanent: true },
      { source: '/article.html', destination: '/articles', permanent: true },
      { source: '/install.html', destination: '/install', permanent: true },
      { source: '/materi.html', destination: '/materi', permanent: true },
      { source: '/absen.html', destination: '/absen', permanent: true },
      { source: '/discussions.html', destination: '/diskusi', permanent: true },
      { source: '/struktur-organisasi.html', destination: '/struktur', permanent: true },
      { source: '/pendaftaran-pkdtm1.html', destination: '/pendaftaran/pkdtm1', permanent: true },
      { source: '/ranking.html', destination: '/ranking', permanent: true },
      { source: '/register.html', destination: '/register', permanent: true },
      { source: '/login.html', destination: '/login', permanent: true },
      { source: '/help.html', destination: '/bantuan', permanent: true },
    ];
  },

  // Aktifkan image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: 'vercel-blob.com' },
    ],
  },
};

export default nextConfig;
