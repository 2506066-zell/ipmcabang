import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Manajemen Absensi' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Manajemen Absensi</h1>
      </div>
      <div id="admin-attendance-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/attendance.js" defer></script>
    </>
  );
}
