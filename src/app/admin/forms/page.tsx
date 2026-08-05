import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Form & PKDTM1' };

export default function Page() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Form & PKDTM1</h1>
      </div>
      <div id="admin-forms-root">
        <div className="admin-loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Memuat modul...</p>
        </div>
      </div>
      <script src="/admin/forms.js" defer></script>
    </>
  );
}
