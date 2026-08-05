import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Analitik & Statistik' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Analitik & Statistik</h1>
      </div>
      <div id="admin-analytics-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/analytics.js" defer></script>
    </>
  );
}
