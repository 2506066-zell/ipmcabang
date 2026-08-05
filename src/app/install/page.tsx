import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cara Install Aplikasi | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      
      <div id="app-root">
        {/* Cara Install Aplikasi page — content loaded by install.html JS */}
        <div id="page-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', color: '#718096' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>Memuat halaman...</p>
          </div>
        </div>
      </div>
      <script src="/app/js/pages/install.js" defer></script>
    </>
  );
}
