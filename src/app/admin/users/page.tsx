import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Manajemen Kader' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Manajemen Kader</h1>
      </div>
      <div id="admin-users-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/users.js" defer></script>
    </>
  );
}
