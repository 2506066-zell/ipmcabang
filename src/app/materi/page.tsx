import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Perpustakaan Digital | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      
      <div id="app-root">
        {/* Perpustakaan Digital page — content loaded by materi.html JS */}
        <div id="page-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', color: '#718096' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>Memuat halaman...</p>
          </div>
        </div>
      </div>
      <script src="/app/js/pages/materi.js" defer></script>
    </>
  );
}
