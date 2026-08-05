import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Struktur Organisasi | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/struktur-zen.css" />
      <div id="app-root">
        {/* Struktur Organisasi page — content loaded by struktur-organisasi.html JS */}
        <div id="page-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', color: '#718096' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>Memuat halaman...</p>
          </div>
        </div>
      </div>
      <script src="/app/js/pages/struktur.js" defer></script>
    </>
  );
}
