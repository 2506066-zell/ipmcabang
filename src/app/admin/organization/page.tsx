import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Struktur Organisasi' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Struktur Organisasi</h1>
      </div>
      <div id="admin-organization-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/organization.js" defer></script>
    </>
  );
}
