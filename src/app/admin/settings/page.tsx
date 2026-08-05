import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Pengaturan Sistem' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Pengaturan Sistem</h1>
      </div>
      <div id="admin-settings-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/settings.js" defer></script>
    </>
  );
}
