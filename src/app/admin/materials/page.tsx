import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Manajemen Materi' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Manajemen Materi</h1>
      </div>
      <div id="admin-materials-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/materials.js" defer></script>
    </>
  );
}
