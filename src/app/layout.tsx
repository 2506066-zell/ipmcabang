import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | PC IPM Panawuan',
    default: 'PC IPM Panawuan - Ikatan Pelajar Muhammadiyah',
  },
  description: 'Platform digital resmi Pimpinan Cabang Ikatan Pelajar Muhammadiyah (PC IPM) Panawuan — perpustakaan digital, artikel, quiz, dan absensi kader.',
  keywords: ['IPM', 'Ikatan Pelajar Muhammadiyah', 'Panawuan', 'IPM Garut', 'PKDTM'],
  authors: [{ name: 'PC IPM Panawuan' }],
  metadataBase: new URL('https://ipmpanawuan.or.id'),
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://ipmpanawuan.or.id',
    siteName: 'PC IPM Panawuan',
    title: 'PC IPM Panawuan - Ikatan Pelajar Muhammadiyah',
    description: 'Platform Perpustakaan Digital dan Artikel Organisasi Ikatan Pelajar Muhammadiyah PC Panawuan.',
    images: [{ url: '/ipm-logo.png', width: 512, height: 512, alt: 'Logo PC IPM Panawuan' }],
  },
  twitter: {
    card: 'summary',
    title: 'PC IPM Panawuan - Ikatan Pelajar Muhammadiyah',
    description: 'Platform digital resmi PC IPM Panawuan.',
    images: ['/ipm-logo.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IPM Panawuan',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a6b3c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="icon" href="/ipm-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/ipm-logo.png" />
      </head>
      <body>
        {children}
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
