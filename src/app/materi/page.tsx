import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Perpustakaan Digital | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />

      <main className="main-content library-main-content">

        <div className="container">
            <div className="library-header">
                <div className="library-heading">
                    <h1 className="page-title">Perpustakaan Digital</h1>
                    <p className="library-subtitle">Akses panduan, modul, dan buku elektronik seputar Ikatan
                        Pelajar Muhammadiyah.</p>
                </div>
                <button type="button" id="library-share-btn" className="library-share-btn" aria-label="Bagikan Perpustakaan Digital">
                    <i className="fas fa-share-nodes"></i><span className="library-share-label">Bagikan</span>
                </button>
            </div>

            <div className="articles-toolbar">
                <div className="search-wrapper">
                    <i className="fas fa-search search-icon"></i>
                    <input type="text" id="mat-search" placeholder="Cari koleksi..." />
                </div>
                <div className="filter-wrapper">
                    <select id="mat-category-select">
                        <option value="all">Semua Kategori</option>
                        <option value="Organisasi">Organisasi</option>
                        <option value="Kaderisasi">Kaderisasi</option>
                        <option value="Keilmuan">Keilmuan</option>
                        <option value="Umum">Umum</option>
                    </select>
                </div>
            </div>

            <section id="material-last-read-card" className="material-last-read" hidden>
                <div className="material-last-read-copy">
                    <p className="material-last-read-kicker">Terakhir Dibaca</p>
                    <h2 id="material-last-read-title" className="material-last-read-title"></h2>
                    <p id="material-last-read-meta" className="material-last-read-meta"></p>
                </div>
                <button type="button" id="material-last-read-resume-btn" className="material-last-read-btn">Lanjut Baca</button>
            </section>

            <div id="materi-grid" className="materi-grid">
                {/* Data will be injected here */}
            </div>

            <div id="materi-load-more-sentinel" className="materi-load-more" hidden>
                <span className="scanner-dot" aria-hidden="true"></span>
                <span>Memuat koleksi lainnya...</span>
            </div>

            <div id="empty-state" hidden style={{ textAlign: 'center', padding: '60px 20px' }}>
                <i className="fas fa-folder-open"
                    style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }}></i>
                <p style={{ color: '#888' }}>Koleksi tidak ditemukan.</p>
            </div>
        </div>
    
</main>

      <script src="/app/js/features/materials/public-materials.js" defer></script>
    </>
  );
}
